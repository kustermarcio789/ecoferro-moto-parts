
DO $$
DECLARE
    brand_id_var UUID;
BEGIN
    -- Brands
    INSERT INTO public.brands (name, slug) VALUES ('HONDA', 'honda') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('YAMAHA', 'yamaha') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('KAWASAKI', 'kawasaki') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('SUZUKI', 'suzuki') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('BMW', 'bmw') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('TRIUMPH', 'triumph') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('Royal Enfield', 'royal-enfield') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('Mottu', 'mottu') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('ECOFERRO', 'ecoferro') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('BIKES', 'bikes') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('FERRAMENTAS', 'ferramentas') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.brands (name, slug) VALUES ('CONSTRUÇÃO', 'construcao') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
END $$;

-- Products will be handled in a separate script or simplified SQL due to volume.
-- Since I can't run large scripts via psql easily without permissions, 
-- and migration is for schema, I'll use the supabase--insert tool with a large block.
