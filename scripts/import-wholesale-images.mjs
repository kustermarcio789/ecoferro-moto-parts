import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Read JSON
  const jsonContent = fs.readFileSync("/tmp/products.json", "utf8");
  const productsJson = JSON.parse(jsonContent);

  // 2. Get products from DB
  const { data: dbProducts, error: dbError } = await supabase
    .from("products")
    .select("id, internal_code")
    .eq("wholesale_only", true);

  if (dbError) throw dbError;

  const codeToId = new Map();
  dbProducts.forEach(p => {
    if (p.internal_code) {
      codeToId.set(p.internal_code.toUpperCase(), p.id);
    }
  });

  const imagesToInsert = [];

  for (const pJson of productsJson) {
    const internalCode = pJson.internal_code;
    const productId = codeToId.get(internalCode.toUpperCase());

    if (!productId) continue;

    const imageFiles = pJson.image_files || [];
    const lowerCode = internalCode.toLowerCase();

    imageFiles.forEach((file, index) => {
      const url = `https://raw.githubusercontent.com/kustermarcio789/ecoferro-moto-parts/main/scripts/extracted/images/${lowerCode}/${file}`;
      imagesToInsert.push({
        product_id: productId,
        url: url,
        alt_text: internalCode,
        sort_order: index,
        is_primary: index === 0
      });
    });
  }

  console.log(`Found ${imagesToInsert.length} images to insert.`);

  // 3. Insert in batches of 100
  for (let i = 0; i < imagesToInsert.length; i += 100) {
    const batch = imagesToInsert.slice(i, i + 100);
    const { error } = await supabase
      .from("product_images")
      .upsert(batch, { onConflict: "product_id,url", ignoreDuplicates: true });

    if (error) {
      console.error("Error inserting batch:", error);
    } else {
      console.log(`Inserted batch ${i / 100 + 1}`);
    }
  }

  console.log("Done.");
}

run().catch(console.error);
