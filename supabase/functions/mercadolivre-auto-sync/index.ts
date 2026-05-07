import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Marcas conhecidas de motos ──────────────────────────────────────
const KNOWN_BRANDS = [
  "Honda", "Yamaha", "Suzuki", "Kawasaki", "BMW", "Harley-Davidson",
  "Ducati", "Triumph", "KTM", "Royal Enfield", "Shineray", "Dafra",
  "Kasinski", "Haojue", "Bajaj", "CF Moto", "Benelli", "Husqvarna",
  "Aprilia",
];
const BRAND_ALIASES: Record<string, string> = {
  "harley": "Harley-Davidson", "hd": "Harley-Davidson",
  "kawazaki": "Kawasaki", "kavasaki": "Kawasaki",
  "cf-moto": "CF Moto", "cfmoto": "CF Moto",
  "royal enfield": "Royal Enfield", "royalenfield": "Royal Enfield",
};
const OWN_BRANDS = ["Ecoferro", "Fantom"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 150);
}

function normalizeBrand(rawBrand: string | null, title: string): string | null {
  const titleLower = (title || "").toLowerCase();

  // Check known brands in title
  for (const brand of KNOWN_BRANDS) {
    if (titleLower.includes(brand.toLowerCase())) return brand;
  }
  for (const brand of OWN_BRANDS) {
    if (titleLower.includes(brand.toLowerCase())) return brand;
  }

  // Check raw brand from ML attributes
  if (rawBrand) {
    const raw = rawBrand.trim();
    const lower = raw.toLowerCase();
    if (BRAND_ALIASES[lower]) return BRAND_ALIASES[lower];
    for (const brand of KNOWN_BRANDS) {
      if (lower === brand.toLowerCase()) return brand;
    }
    // If clean enough (< 25 chars, no garbage)
    if (raw.length > 1 && raw.length < 25 && !/\d{5,}/.test(raw)) {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }

  return null;
}

function extractAttribute(attributes: any[], idSet: Set<string>): string | null {
  if (!Array.isArray(attributes)) return null;
  for (const attr of attributes) {
    if (idSet.has(attr.id) && attr.value_name) return attr.value_name;
  }
  return null;
}

const BRAND_IDS = new Set(["BRAND", "MARCA", "VEHICLE_BRAND"]);

// ── Token ML ──────────────────────────────────────────────────────
async function getAccessToken(supabase: any): Promise<string | null> {
  const appId = Deno.env.get("MERCADOLIVRE_APP_ID");
  const secretKey = Deno.env.get("MERCADOLIVRE_SECRET_KEY");

  const { data: setting } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "ml_oauth_tokens")
    .maybeSingle();

  if (!setting?.value?.access_token) return null;

  const tokens = setting.value;
  const obtainedAt = new Date(tokens.obtained_at).getTime();
  const expiresAt = obtainedAt + (tokens.expires_in || 21600) * 1000;

  if (Date.now() > expiresAt - 600000 && tokens.refresh_token && appId && secretKey) {
    console.log("[auto-sync] Refreshing ML token...");
    const resp = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: appId,
        client_secret: secretKey,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      await supabase.from("site_settings").upsert(
        {
          key: "ml_oauth_tokens",
          value: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            user_id: data.user_id || tokens.user_id,
            obtained_at: new Date().toISOString(),
          },
        },
        { onConflict: "key" },
      );
      return data.access_token;
    }
    console.error("[auto-sync] Token refresh failed:", await resp.text());
  }

  return tokens.access_token;
}

// ── Buscar ou criar marca ─────────────────────────────────────────
async function getOrCreateBrandId(
  supabase: any,
  brandName: string | null,
  brandCache: Map<string, string>,
): Promise<string | null> {
  if (!brandName) return null;

  const cacheKey = brandName.toLowerCase();
  if (brandCache.has(cacheKey)) return brandCache.get(cacheKey)!;

  // Search existing
  const { data: existing } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", brandName)
    .limit(1)
    .maybeSingle();

  if (existing) {
    brandCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Create new brand
  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name: brandName, slug: slugify(brandName) })
    .select("id")
    .single();

  if (created) {
    brandCache.set(cacheKey, created.id);
    return created.id;
  }

  console.error("[auto-sync] Failed to create brand:", brandName, error);
  return null;
}

// ── Handler principal ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const accessToken = await getAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "ML nao conectado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Get seller ID
    const meResp = await fetch("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meResp.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Token invalido (${meResp.status}).` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { id: sellerId } = await meResp.json();
    console.log("[auto-sync] Seller:", sellerId);

    // 2. Fetch ALL item IDs with pagination
    const allItemIds: string[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const searchResp = await fetch(
        `https://api.mercadolibre.com/users/${sellerId}/items/search?offset=${offset}&limit=${limit}&status=active`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!searchResp.ok) break;
      const { results, paging } = await searchResp.json();
      if (!results?.length) break;
      allItemIds.push(...results);
      offset += limit;
      if (offset >= (paging?.total || 0)) break;
    }
    console.log("[auto-sync] Found", allItemIds.length, "active items");

    if (!allItemIds.length) {
      return new Response(
        JSON.stringify({ success: true, created: 0, updated: 0, total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Fetch item details in batches of 20
    const mlItems: any[] = [];
    for (let i = 0; i < allItemIds.length; i += 20) {
      const batch = allItemIds.slice(i, i + 20);
      const resp = await fetch(
        `https://api.mercadolibre.com/items?ids=${batch.join(",")}&attributes=id,title,price,original_price,available_quantity,sold_quantity,status,condition,thumbnail,permalink,pictures,attributes,seller_custom_field,shipping`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!resp.ok) continue;
      const details = await resp.json();
      for (const item of details) {
        if (item.code === 200 && item.body) mlItems.push(item.body);
      }
      // Rate limit: small delay between batches
      if (i + 20 < allItemIds.length) await new Promise((r) => setTimeout(r, 200));
    }
    console.log("[auto-sync] Fetched details for", mlItems.length, "items");

    // 4. Get existing products by ml_id
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, ml_id, slug")
      .not("ml_id", "is", null);

    const existingByMlId = new Map<string, { id: string; slug: string }>();
    for (const p of existingProducts || []) {
      if (p.ml_id) existingByMlId.set(p.ml_id, { id: p.id, slug: p.slug });
    }

    // 5. Get existing slugs to avoid conflicts
    const { data: allSlugs } = await supabase.from("products").select("slug");
    const usedSlugs = new Set((allSlugs || []).map((p: any) => p.slug));

    // Brand cache
    const brandCache = new Map<string, string>();

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const ml of mlItems) {
      try {
        // Extract brand
        const rawBrand = extractAttribute(ml.attributes || [], BRAND_IDS);
        const brand = normalizeBrand(rawBrand, ml.title || "");
        const brandId = await getOrCreateBrandId(supabase, brand, brandCache);

        // Generate unique slug
        let baseSlug = slugify(ml.title || ml.id);
        let slug = baseSlug;
        let suffix = 1;

        const existing = existingByMlId.get(ml.id);

        // For new products, ensure unique slug
        if (!existing) {
          while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix++}`;
          }
        }

        // Prepare product data
        const productData: Record<string, any> = {
          name: ml.title,
          price: ml.price || 0,
          original_price: ml.original_price || null,
          stock: ml.available_quantity || 0,
          ml_id: ml.id,
          ml_permalink: ml.permalink,
          sku: ml.seller_custom_field || null,
          is_active: true,
          brand_id: brandId,
        };

        if (existing) {
          // UPDATE existing product (price + stock + brand)
          const { error: updateErr } = await supabase
            .from("products")
            .update(productData)
            .eq("id", existing.id);

          if (updateErr) {
            console.error("[auto-sync] Update error:", ml.id, updateErr.message);
            errors++;
            continue;
          }

          // Sync images
          await syncImages(supabase, existing.id, ml.pictures || [], ml.thumbnail);
          updated++;
        } else {
          // INSERT new product
          productData.slug = slug;
          productData.short_description = `${brand || ""} ${ml.title || ""}`.trim();

          const { data: createdProduct, error: insertErr } = await supabase
            .from("products")
            .insert(productData)
            .select("id")
            .single();

          if (insertErr) {
            // Slug conflict - try with ml_id suffix
            productData.slug = `${baseSlug}-${ml.id.toLowerCase()}`;
            const { data: retry, error: retryErr } = await supabase
              .from("products")
              .insert(productData)
              .select("id")
              .single();

            if (retryErr) {
              console.error("[auto-sync] Insert error:", ml.id, retryErr.message);
              errors++;
              continue;
            }
            if (retry) {
              await syncImages(supabase, retry.id, ml.pictures || [], ml.thumbnail);
              await createExternalMapping(supabase, retry.id, ml.id);
              usedSlugs.add(productData.slug);
              created++;
            }
          } else if (createdProduct) {
            await syncImages(supabase, createdProduct.id, ml.pictures || [], ml.thumbnail);
            await createExternalMapping(supabase, createdProduct.id, ml.id);
            usedSlugs.add(slug);
            created++;
          }
        }
      } catch (itemErr) {
        console.error("[auto-sync] Item error:", ml.id, itemErr);
        errors++;
      }
    }

    // 6. Log result
    const summary = {
      timestamp: new Date().toISOString(),
      total_ml_items: mlItems.length,
      created,
      updated,
      errors,
    };
    console.log("[auto-sync] Summary:", JSON.stringify(summary));

    await supabase.from("site_settings").upsert(
      { key: "ml_auto_sync_last_run", value: summary },
      { onConflict: "key" },
    );

    await supabase.from("integration_logs").insert({
      integration_key: "mercadolivre-auto-sync",
      source_system: "mercado_livre",
      destination_system: "ecoferro-website",
      direction: "inbound",
      event_type: "catalog_sync",
      status: "processed",
      source_reference: summary.timestamp,
      request_payload: { seller_id: sellerId, total_items: allItemIds.length },
      response_payload: summary,
      quantity: created + updated,
      processed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[auto-sync] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Sincronizar imagens ──────────────────────────────────────────
async function syncImages(
  supabase: any,
  productId: string,
  pictures: any[],
  thumbnail: string | null,
) {
  // Get existing images
  const { data: existingImages } = await supabase
    .from("product_images")
    .select("id, url")
    .eq("product_id", productId);

  const existingUrls = new Set((existingImages || []).map((img: any) => img.url));

  // Prepare images from ML
  const mlImages = pictures.length > 0
    ? pictures.map((pic: any, idx: number) => ({
        url: (pic.secure_url || pic.url || "").replace("http://", "https://"),
        is_primary: idx === 0,
        sort_order: idx,
      }))
    : thumbnail
      ? [{ url: thumbnail.replace("http://", "https://"), is_primary: true, sort_order: 0 }]
      : [];

  // Only insert images that don't already exist
  const newImages = mlImages.filter((img) => img.url && !existingUrls.has(img.url));

  if (newImages.length > 0) {
    const { error } = await supabase.from("product_images").insert(
      newImages.map((img) => ({
        product_id: productId,
        url: img.url,
        is_primary: img.is_primary && (existingImages || []).length === 0,
        sort_order: img.sort_order + (existingImages || []).length,
      })),
    );
    if (error) {
      console.error("[auto-sync] Image sync error:", productId, error.message);
    }
  }
}

// ── Criar mapeamento externo ──────────────────────────────────────
async function createExternalMapping(supabase: any, productId: string, mlId: string) {
  await supabase.from("product_external_mappings").upsert(
    {
      product_id: productId,
      source_system: "mercado_livre",
      external_product_id: mlId,
      is_active: true,
      metadata: { auto_synced: true, synced_at: new Date().toISOString() },
    },
    { onConflict: "product_id,source_system" },
  );
}
