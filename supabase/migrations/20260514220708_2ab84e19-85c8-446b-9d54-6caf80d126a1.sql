-- Enhance products table for better sync tracking
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'vendas-vps',
ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_external_id ON public.products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_last_sync_at ON public.products(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active_wholesale ON public.products(is_active, wholesale_only);

-- Create a helper function to identify products without categories
CREATE OR REPLACE VIEW public.vw_products_no_category AS
SELECT * FROM public.products WHERE category_id IS NULL;

-- Create a helper function for low stock products
CREATE OR REPLACE VIEW public.vw_products_low_stock AS
SELECT p.* 
FROM public.products p
LEFT JOIN public.inventory_balances ib ON p.id = ib.product_id
WHERE COALESCE(ib.available_quantity, p.stock, 0) <= COALESCE(ib.low_stock_threshold, p.min_stock, 5)
AND p.is_active = true;

-- Update RLS for these views if needed (they inherit from base tables usually, but good to be sure)
ALTER VIEW public.vw_products_no_category SET (security_invoker = on);
ALTER VIEW public.vw_products_low_stock SET (security_invoker = on);
