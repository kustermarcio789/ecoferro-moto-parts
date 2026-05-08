import json
import re
import psycopg2
from psycopg2.extras import execute_values
import os

def slugify(text):
    if not text:
        return ""
    text = str(text).lower()
    # Replace non-alphanumeric with hyphen
    text = re.sub(r'[^a-z0-9]+', '-', text)
    # Remove duplicate hyphens
    text = re.sub(r'-+', '-', text).strip('-')
    return text[:120]

def import_products():
    # Use environment variables for connection
    dbname = os.environ.get('PGDATABASE')
    user = os.environ.get('PGUSER')
    password = os.environ.get('PGPASSWORD')
    host = os.environ.get('PGHOST')
    port = os.environ.get('PGPORT')

    conn = psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port
    )
    cur = conn.cursor()

    try:
        # File was uploaded via user-uploads://products.json
        # I need to use document--parse_document or similar if it's large, 
        # but since I should have access via the local filesystem if I copy it correctly.
        # However, the previous copy failed. I will try to read it directly if possible or 
        # assume the user will provide it in a way I can access.
        # Actually, I'll use the path from the user's prompt instruction.
        
        path = 'scripts/extracted/products.json'
        if not os.path.exists(path):
            # Fallback to current directory if not in scripts/extracted
            path = 'products.json'
            
        with open(path, 'r') as f:
            products = json.load(f)

        # Get unique brands
        brands = set()
        for p in products:
            if p.get('brand'):
                brands.add(p['brand'])

        # Upsert brands
        brand_map = {}
        for brand_name in brands:
            slug = slugify(brand_name)
            cur.execute("""
                INSERT INTO public.brands (name, slug, is_active)
                VALUES (%s, %s, true)
                ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                RETURNING id;
            """, (brand_name, slug))
            brand_map[brand_name] = cur.fetchone()[0]

        # Prepare products data
        product_data = []
        for p in products:
            internal_code = str(p.get('internal_code', ''))
            if not internal_code:
                continue
                
            name = p.get('name', '')
            long_desc = p.get('long_description', '')
            short_desc = long_desc[:280] if long_desc else ''
            brand_name = p.get('brand')
            brand_id = brand_map.get(brand_name)
            wholesale_price = p.get('wholesale_price')
            
            # Clean wholesale_price if it's a string like "R$ 10,00"
            if isinstance(wholesale_price, str):
                wholesale_price = re.sub(r'[^\d,.]', '', wholesale_price).replace(',', '.')
                try:
                    wholesale_price = float(wholesale_price)
                except:
                    wholesale_price = None

            price = wholesale_price if wholesale_price is not None else 0
            weight = p.get('weight_kg', 0)
            ncm = p.get('ncm')
            slug = slugify(f"{internal_code}-{name}")

            product_data.append((
                internal_code,
                internal_code, # sku
                name,
                long_desc,
                short_desc,
                brand_id,
                wholesale_price,
                price,
                weight,
                ncm,
                True, # is_active
                False, # wholesale_only
                1, # moq
                slug
            ))

        # Upsert products
        query = """
            INSERT INTO public.products (
                internal_code, sku, name, description, short_description,
                brand_id, wholesale_price, price, weight, ncm,
                is_active, wholesale_only, moq, slug
            )
            VALUES %s
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
                updated_at = now();
        """
        execute_values(cur, query, product_data)
        
        conn.commit()
        print(f"Successfully imported {len(product_data)} products.")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import_products()
