-- Update products from VPS to be visible on public site and have correct source
UPDATE public.products 
SET 
  source = 'mercadolivre',
  visible_site = true,
  visible_wholesale = false
WHERE 
  sync_source = 'vendas-vps' 
  OR source = 'mercadolivre';

-- Double check that wholesale source products are NOT visible on site
UPDATE public.products
SET
  visible_site = false
WHERE
  source = 'wholesale';
