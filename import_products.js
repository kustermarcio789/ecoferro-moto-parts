import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const brandNames = [...new Set(products.map(p => p.brand).filter(Boolean))];
    const brandMap = new Map();

    for (const brandName of brandNames) {
      const slug = slugify(brandName);
      const { data, error } = await supabase
        .from('brands')
        .upsert({ name: brandName, slug: slug, is_active: true }, { onConflict: 'slug' })
        .select('id')
        .single();
      
      if (error) {
        console.error(`Error upserting brand ${brandName}:`, error.message);
        continue;
      }
      brandMap.set(brandName, data.id);
    }

    let okCount = 0;
    for (let i = 0; i < products.length; i += 50) {
      const chunk = products.slice(i, i + 50);
      const payloads = chunk.map(p => {
        if (!p.internal_code) return null;
        const brandId = brandMap.get(p.brand);
        const name = p.name || "";
        const description = p.long_description || "";
        const short_description = description.slice(0, 280);
        const wholesale_price = typeof p.wholesale_price === 'number' ? p.wholesale_price : null;
        
        return {
          internal_code: p.internal_code,
          sku: p.internal_code,
          name: name,
          description: description,
          short_description: short_description,
          brand_id: brandId,
          wholesale_price: wholesale_price,
          price: wholesale_price || 0,
          weight: p.weight_kg || 0,
          ncm: p.ncm || null,
          is_active: true,
          wholesale_only: false,
          moq: 1,
          slug: slugify(`${p.internal_code}-${name}`),
          updated_at: new Date().toISOString()
        };
      }).filter(Boolean);

      const { error } = await supabase
        .from('products')
        .upsert(payloads, { onConflict: 'internal_code' });

      if (error) {
        console.error(`Error upserting chunk:`, error.message);
      } else {
        okCount += payloads.length;
        console.log(`Progress: ${okCount}/${products.length}`);
      }
    }

    console.log(`Successfully imported ${okCount} products.`);
    
    const { data: stats, error: statsErr } = await supabase.rpc('get_import_stats');
    if (!statsErr) {
       console.log('STATS:', JSON.stringify(stats));
    } else {
       // Fallback if RPC doesn't exist yet
       const { count: total } = await supabase.from('products').select('*', { count: 'exact', head: true });
       console.log('TOTAL PRODUCTS:', total);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

importProducts();
