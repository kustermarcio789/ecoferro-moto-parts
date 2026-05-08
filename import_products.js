import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const sql = postgres({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: false
});

function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

async function importProducts() {
  try {
    const productsPath = fs.existsSync('scripts/extracted/products.json') 
      ? 'scripts/extracted/products.json' 
      : 'products.json';
    
    if (!fs.existsSync(productsPath)) {
      console.error(`File not found: ${productsPath}`);
      process.exit(1);
    }

    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    console.log(`Loading ${products.length} products...`);

    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    const brandMap = new Map();

    for (const brandName of brands) {
      const slug = slugify(brandName);
      const [brand] = await sql`
        INSERT INTO public.brands (name, slug, is_active)
        VALUES (${brandName}, ${slug}, true)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      brandMap.set(brandName, brand.id);
    }

    let count = 0;
    for (const p of products) {
      if (!p.internal_code) continue;

      const brandId = brandMap.get(p.brand);
      const name = p.name || "";
      const description = p.long_description || "";
      const short_description = description.slice(0, 280);
      const wholesale_price = typeof p.wholesale_price === 'number' ? p.wholesale_price : null;
      const price = wholesale_price || 0;
      const weight = p.weight_kg || 0;
      const slug = slugify(`${p.internal_code}-${name}`);

      await sql`
        INSERT INTO public.products (
          internal_code, sku, name, description, short_description,
          brand_id, wholesale_price, price, weight, ncm,
          is_active, wholesale_only, moq, slug, updated_at
        ) VALUES (
          ${p.internal_code}, ${p.internal_code}, ${name}, ${description}, ${short_description},
          ${brandId}, ${wholesale_price}, ${price}, ${weight}, ${p.ncm || null},
          true, false, 1, ${slug}, now()
        )
        ON CONFLICT (internal_code) DO UPDATE SET
          sku = EXCLUDED.sku,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          short_description = EXCLUDED.short_description,
          brand_id = EXCLUDED.brand_id,
          wholesale_price = EXCLUDED.wholesale_price,
          price = EXCLUDED.price,
          weight = EXCLUDED.weight,
          ncm = EXCLUDED.ncm,
          is_active = EXCLUDED.is_active,
          wholesale_only = EXCLUDED.wholesale_only,
          moq = EXCLUDED.moq,
          slug = EXCLUDED.slug,
          updated_at = now()
      `;
      count++;
    }

    console.log(`Successfully imported ${count} products.`);
    
    const [stats] = await sql`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE internal_code IS NOT NULL) as com_internal_code,
        count(DISTINCT brand_id) as marcas
      FROM public.products
    `;
    console.log('STATS:', JSON.stringify(stats));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

importProducts();
