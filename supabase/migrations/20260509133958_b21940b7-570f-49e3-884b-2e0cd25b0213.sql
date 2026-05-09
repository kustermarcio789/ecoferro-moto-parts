-- Update products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_available_stock ON public.products(available_stock);

-- Create sync logs table
CREATE TABLE IF NOT EXISTS public.stock_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed')),
  total_skus_received INT,
  total_skus_updated INT,
  total_skus_not_found INT,
  error_message TEXT,
  source_url TEXT
);

-- Enable RLS for logs
ALTER TABLE public.stock_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read logs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_sync_logs' AND policyname = 'Admins read sync logs'
  ) THEN
    CREATE POLICY "Admins read sync logs" ON public.stock_sync_logs FOR SELECT
      USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Configure cron job for sync (every 10 minutes)
-- We use net.http_post to call the edge function
SELECT cron.schedule(
  'sync-ml-stock-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM settings WHERE key = 'api_url') || '/functions/v1/sync-ml-stock',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
    )
  ) AS request_id;
  $$
);
