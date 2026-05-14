-- Add new visibility and source columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS visible_site BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_wholesale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visible_marketplace BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal';

-- Update existing data: VPS products (sync_source = 'vendas-vps')
UPDATE public.products
SET 
  source = 'mercadolivre',
  visible_site = true,
  visible_wholesale = false,
  visible_marketplace = true
WHERE sync_source = 'vendas-vps';

-- Update existing data: Wholesale products (wholesale_only = true)
UPDATE public.products
SET 
  visible_site = false,
  visible_wholesale = true
WHERE wholesale_only = true;
