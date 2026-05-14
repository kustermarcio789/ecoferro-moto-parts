-- Step 1: Ensure all products have the correct 'source' and visibility based on their current data
-- VPS/Mercado Livre products
UPDATE public.products
SET 
  source = 'mercadolivre',
  visible_site = true,
  visible_wholesale = false,
  visible_marketplace = true
WHERE sync_source = 'vendas-vps' OR source = 'mercadolivre';

-- Wholesale products
UPDATE public.products
SET 
  source = 'wholesale',
  visible_site = false,
  visible_wholesale = true,
  visible_marketplace = false
WHERE wholesale_only = true OR visible_wholesale = true AND (source != 'mercadolivre' OR source IS NULL);

-- Internal/Other products (fallback)
UPDATE public.products
SET 
  source = 'internal'
WHERE source IS NULL;

-- Step 2: Ensure strict consistency for existing products to avoid mixing
UPDATE public.products SET visible_wholesale = false WHERE source = 'mercadolivre';
UPDATE public.products SET visible_site = false WHERE source = 'wholesale';
