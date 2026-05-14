ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS allow_negative_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_on_demand BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS technical_specs TEXT,
ADD COLUMN IF NOT EXISTS dimensions_info TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS finish TEXT,
ADD COLUMN IF NOT EXISTS lead_time TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS product_class TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'both';

-- Add comment to columns for better understanding
COMMENT ON COLUMN public.products.target_audience IS 'Target audience for the product: retail, wholesale, or both';
COMMENT ON COLUMN public.products.unit IS 'Unit of measurement: un, kg, meter, kit, par, caixa, personalizado';
