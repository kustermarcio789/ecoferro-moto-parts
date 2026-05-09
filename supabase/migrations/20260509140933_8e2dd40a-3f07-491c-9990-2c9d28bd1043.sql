ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_available_stock ON public.products(available_stock);

CREATE TABLE IF NOT EXISTS public.stock_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed')),
  total_received INT,
  total_updated INT,
  total_not_found INT,
  error_message TEXT,
  source_url TEXT
);

ALTER TABLE public.stock_sync_logs ENABLE ROW LEVEL SECURITY;

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

-- Setting up the cron job using pg_net if available or direct call (assuming pg_cron is available)
-- Note: We'll also try to enable the extension if it's not enabled, though usually it requires superuser.
-- In Lovable/Supabase environments, pg_cron is usually available.
SELECT cron.schedule(
  'sync-ml-stock-every-10min',
  '*/10 * * * *',
  $$ SELECT net.http_post(
      url:=(SELECT value FROM (SELECT COALESCE(
        (SELECT value FROM net.http_header WHERE name = 'Authorization'),
        'Bearer ' || current_setting('app.settings.service_role_key', true)
      )) as t(value)) LIMIT 1),
      url:='https://patlhzysljihbqemsjzn.supabase.co/functions/v1/sync-ml-stock',
      headers:='{"Content-Type": "application/json"}'::jsonb
  ) $$
);
