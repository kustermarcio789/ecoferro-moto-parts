-- Part 1: New Migration for Order Priority and Partial Delivery
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal','urgent','critical'));

CREATE INDEX IF NOT EXISTS idx_orders_priority ON public.orders(priority);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS confirmed_quantity INT,
  ADD COLUMN IF NOT EXISTS delivered_quantity INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.order_items.confirmed_quantity IS 'Quantidade que o admin confirmou que vai entregar (pode ser <= quantity solicitada). NULL = ainda não confirmado.';
COMMENT ON COLUMN public.order_items.delivered_quantity IS 'Quantidade efetivamente entregue até o momento (<= confirmed_quantity).';

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow public read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Storage policy to allow authenticated uploads (for the script/admin)
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );
