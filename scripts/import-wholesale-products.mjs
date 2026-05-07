#!/usr/bin/env node
/**
 * Lê scripts/extracted/products.json (gerado por extract-wholesale-spreadsheet.py),
 * cria/atualiza registros em public.products + public.brands,
 * faz upload das imagens para o bucket Storage `product-images` e
 * cria entradas em public.product_images.
 *
 * Variáveis de ambiente obrigatórias:
 *   SUPABASE_URL              — ex: https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (NÃO o anon)
 *
 * Uso:
 *   node scripts/import-wholesale-products.mjs           # cria/atualiza produtos
 *   node scripts/import-wholesale-products.mjs --no-images   # pula upload de imagens
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const extractedDir = path.join(projectRoot, "scripts", "extracted");
const productsPath = path.join(extractedDir, "products.json");
const imagesRoot = path.join(extractedDir, "images");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
const SKIP_IMAGES = process.argv.includes("--no-images");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.");
  process.exit(1);
}
if (!fs.existsSync(productsPath)) {
  console.error(`Arquivo não encontrado: ${productsPath}\nRode antes: python scripts/extract-wholesale-spreadsheet.py "<arquivo>.ods"`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const slugify = (str) =>
  String(str)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (error && error.statusCode !== 404 && !/not found/i.test(error.message)) throw error;
  if (!data) {
    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
    if (createError) throw createError;
    console.log(`Bucket criado: ${STORAGE_BUCKET}`);
  }
}

const brandCache = new Map();
async function getOrCreateBrand(name) {
  if (!name) return null;
  if (brandCache.has(name)) return brandCache.get(name);
  const slug = slugify(name);
  const { data: existing } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    brandCache.set(name, existing.id);
    return existing.id;
  }
  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name, slug, is_active: true })
    .select("id")
    .single();
  if (error) throw error;
  brandCache.set(name, created.id);
  return created.id;
}

async function upsertProduct(p) {
  const brandId = await getOrCreateBrand(p.brand);
  const slug = slugify(`${p.internal_code}-${p.name}`).slice(0, 120) || slugify(p.internal_code);
  const payload = {
    internal_code: p.internal_code,
    sku: p.internal_code,
    slug,
    name: p.name,
    description: p.long_description,
    short_description: p.long_description?.slice(0, 280) ?? null,
    brand_id: brandId,
    wholesale_price: p.wholesale_price ?? null,
    price: p.wholesale_price ?? 0,
    weight: p.weight_kg ?? 0,
    ncm: p.ncm || null,
    is_active: true,
    wholesale_only: false,
    moq: 1,
  };

  // upsert by internal_code
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("internal_code", p.internal_code)
    .maybeSingle();

  let productId;
  if (existing) {
    const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
    if (error) throw error;
    productId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    productId = created.id;
  }
  return productId;
}

async function uploadImages(productId, internalCode, imageFiles) {
  if (!imageFiles?.length) return 0;
  const folder = slugify(internalCode);
  let uploadedCount = 0;
  for (let i = 0; i < imageFiles.length; i++) {
    const localPath = path.join(imagesRoot, folder, imageFiles[i]);
    if (!fs.existsSync(localPath)) continue;
    const buf = fs.readFileSync(localPath);
    const ext = path.extname(imageFiles[i]).toLowerCase() || ".jpg";
    const remoteName = `wholesale/${folder}/${i + 1}${ext}`;
    const contentType =
      ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(remoteName, buf, { upsert: true, contentType });
    if (upErr) {
      console.warn(`  ⚠ upload ${remoteName}: ${upErr.message}`);
      continue;
    }
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(remoteName);
    const url = pub?.publicUrl;
    if (!url) continue;
    // upsert into product_images
    const { data: existingImg } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .eq("url", url)
      .maybeSingle();
    if (!existingImg) {
      const { error: imgErr } = await supabase.from("product_images").insert({
        product_id: productId,
        url,
        alt_text: internalCode,
        sort_order: i,
        is_primary: i === 0,
      });
      if (imgErr) {
        console.warn(`  ⚠ product_images insert: ${imgErr.message}`);
        continue;
      }
    }
    uploadedCount++;
  }
  return uploadedCount;
}

async function main() {
  const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  console.log(`Encontrados ${products.length} produtos para importar.`);

  if (!SKIP_IMAGES) {
    await ensureBucket();
  }

  let okProducts = 0;
  let totalImages = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const productId = await upsertProduct(p);
      okProducts++;
      let imgCount = 0;
      if (!SKIP_IMAGES) {
        imgCount = await uploadImages(productId, p.internal_code, p.image_files);
        totalImages += imgCount;
      }
      console.log(
        `[${i + 1}/${products.length}] ${p.internal_code}: ${p.name.slice(0, 50)} ` +
          `${imgCount ? `(${imgCount} img)` : ""}`,
      );
    } catch (err) {
      console.error(`[${i + 1}/${products.length}] ${p.internal_code} FALHOU: ${err.message}`);
    }
  }

  console.log(`\nResumo: ${okProducts}/${products.length} produtos OK · ${totalImages} imagens enviadas`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
