import json
import re
import psycopg2
from psycopg2.extras import execute_values
import os

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text).strip('-')
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
        with open('/tmp/products.json', 'r') as f:
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
                INSERT INTO public.brands (name, slug)
                VALUES (%s, %s)
                ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                RETURNING id;
            """, (brand_name, slug))
            brand_map[brand_name] = cur.fetchone()[0]

        # Prepare products data
        product_data = []
        for p in products:
            internal_code = p.get('internal_code')
            name = p.get('name', '')
            long_desc = p.get('long_description', '')
            short_desc = long_desc[:280] if long_desc else ''
            brand_name = p.get('brand')
            brand_id = brand_map.get(brand_name)
            wholesale_price = p.get('wholesale_price')
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
        print(f"Successfully imported {len(products)} products.")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import_products()
