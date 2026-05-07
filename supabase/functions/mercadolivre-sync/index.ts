import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const response = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: appId,
        client_secret: secretKey,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      await supabase.from("site_settings").upsert({
        key: "ml_oauth_tokens",
        value: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          user_id: data.user_id || tokens.user_id,
          obtained_at: new Date().toISOString(),
        },
      }, { onConflict: "key" });
      return data.access_token;
    }
  }

  return tokens.access_token;
}

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
        JSON.stringify({ success: false, error: "ML nao conectado. Autorize em Configuracoes." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: localProducts, error: localError } = await supabase
      .from("products")
      .select("id, name, ml_id, price, stock")
      .not("ml_id", "is", null);

    if (localError) throw localError;

    if (!localProducts?.length) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, skipped: 0, changes: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mlIds = localProducts.map((product) => product.ml_id).filter(Boolean);
    const mlMap = new Map<string, any>();

    for (let index = 0; index < mlIds.length; index += 20) {
      const batch = mlIds.slice(index, index + 20);
      const response = await fetch(`https://api.mercadolibre.com/items?ids=${batch.join(",")}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) continue;

      const items = await response.json();
      for (const item of items) {
        if (item.code === 200 && item.body) mlMap.set(item.body.id, item.body);
      }
    }

    const changes: any[] = [];

    for (const local of localProducts) {
      const remote = mlMap.get(local.ml_id);
      if (!remote) {
        changes.push({
          name: local.name,
          ml_id: local.ml_id,
          missing_listing: true,
        });
        continue;
      }

      const priceDiff = Math.abs(Number(remote.price || 0) - Number(local.price || 0)) > 0.01;
      const stockDiff = Number(remote.available_quantity || 0) !== Number(local.stock || 0);

      if (priceDiff || stockDiff) {
        changes.push({
          name: local.name,
          ml_id: local.ml_id,
          price: priceDiff ? { remote: remote.price, admin: local.price } : null,
          stock: stockDiff ? { remote: remote.available_quantity || 0, admin: local.stock || 0 } : null,
        });
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      total_ml: mlMap.size,
      total_local: localProducts.length,
      synced: localProducts.length - changes.length,
      skipped: changes.length,
      changes,
      source_of_truth: "ecoferro-admin",
    };

    await supabase.from("site_settings").upsert({
      key: "ml_sync_last_run",
      value: summary,
    }, { onConflict: "key" });

    await supabase.from("integration_logs").insert({
      integration_key: "mercadolivre-catalog-audit",
      source_system: "mercado_livre",
      destination_system: "ecoferro-admin",
      direction: "inbound",
      event_type: "catalog_audit",
      status: "processed",
      source_reference: summary.timestamp,
      request_payload: { linked_products: localProducts.length },
      response_payload: summary,
      quantity: localProducts.length,
      processed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("mercadolivre-sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
