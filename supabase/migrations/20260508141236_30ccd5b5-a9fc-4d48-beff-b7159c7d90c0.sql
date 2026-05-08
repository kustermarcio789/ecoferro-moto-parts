-- 1. inventory_integration_hardening
-- (Note: Using full content read from files)
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'entry_from_production';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'sale';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'manual_adjustment';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'damaged_loss';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'cancellation_reversal';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'release_reservation';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS internal_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_internal_code_unique ON public.products (lower(internal_code)) WHERE internal_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inventory_balances (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  damaged_quantity INT NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins manage inventory balances" ON public.inventory_balances FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.product_external_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  external_product_id TEXT,
  external_code TEXT,
  external_sku TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_external_mappings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins manage product mappings" ON public.product_external_mappings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key TEXT NOT NULL,
  source_system TEXT NOT NULL,
  destination_system TEXT NOT NULL DEFAULT 'ecoferro-admin',
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
  external_event_id TEXT,
  source_reference TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_mapping_id UUID REFERENCES public.product_external_mappings(id) ON DELETE SET NULL,
  product_code TEXT,
  sku TEXT,
  quantity INT,
  stage TEXT,
  operator_name TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 1,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins manage integration logs" ON public.integration_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS source_system TEXT,
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS external_event_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_reserved INT,
  ADD COLUMN IF NOT EXISTS new_reserved INT,
  ADD COLUMN IF NOT EXISTS integration_log_id UUID REFERENCES public.integration_logs(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_sales_channel_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_sales_channel_check CHECK (sales_channel IS NULL OR sales_channel IN ('website','atacado','mercado_livre','barracao','other','retail','wholesale','affiliate','partner'));

-- 2. wholesale_b2b_production_tracking
CREATE TABLE IF NOT EXISTS public.production_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  default_duration_days NUMERIC(5,2) NOT NULL DEFAULT 1,
  weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  color TEXT DEFAULT '#22c55e',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Stages readable by authenticated" ON public.production_stages FOR SELECT TO authenticated USING (is_active = true);
  CREATE POLICY "Admins manage stages" ON public.production_stages FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

INSERT INTO public.production_stages (code, name, description, sort_order, default_duration_days, weight_percentage, color)
VALUES
  ('recebimento',  'Recebimento da Matéria-Prima', 'Entrada de chapas e perfis no barracão', 1, 1, 5,  '#94a3b8'),
  ('corte',        'Corte',                         'Corte das chapas / perfis conforme projeto', 2, 1, 10, '#64748b'),
  ('dobra',        'Dobra / Conformação',           'Dobramento e conformação das peças',         3, 1, 10, '#0ea5e9'),
  ('soldagem',     'Soldagem / Montagem Bruta',     'Solda das peças formadas',                   4, 2, 20, '#f59e0b'),
  ('acabamento',   'Acabamento / Lixamento',        'Rebarba, polimento e preparação',            5, 1, 10, '#a855f7'),
  ('pintura',      'Pintura Eletrostática',         'Pintura do lote',                            6, 2, 20, '#ef4444'),
  ('montagem',     'Montagem Final',                'Montagem dos kits',                          7, 1, 10, '#22c55e'),
  ('embalagem',    'Embalagem / Inspeção',          'Embalagem e inspeção final',                 8, 1, 8,  '#06b6d4'),
  ('expedicao',    'Expedição / Entrega',           'Despacho ao atacadista',                     9, 2, 7,  '#16a34a')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  weight_percentage = EXCLUDED.weight_percentage,
  updated_at = now();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wholesale_customer_id UUID REFERENCES public.wholesale_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS production_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overall_progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atacadista_notes TEXT;

CREATE TABLE IF NOT EXISTS public.order_production_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.production_stages(id) ON DELETE RESTRICT,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expected_start_at TIMESTAMPTZ,
  expected_completion_at TIMESTAMPTZ,
  operator_name TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, stage_id)
);
ALTER TABLE public.order_production_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins manage production progress" ON public.order_production_progress FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Wholesale views own order progress" ON public.order_production_progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.wholesale_customers wc ON wc.id = o.wholesale_customer_id WHERE o.id = order_production_progress.order_id AND wc.user_id = auth.uid()));
EXCEPTION WHEN others THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.recalculate_order_progress(p_order_id UUID) RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total NUMERIC := 0; v_total_weight NUMERIC := 0; v_overall NUMERIC := 0; v_estimated_delivery TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(SUM(opp.percentage * s.weight_percentage / 100.0), 0), COALESCE(SUM(s.weight_percentage), 0) INTO v_total, v_total_weight FROM public.order_production_progress opp JOIN public.production_stages s ON s.id = opp.stage_id WHERE opp.order_id = p_order_id;
  IF v_total_weight > 0 THEN v_overall := ROUND((v_total * 100.0 / v_total_weight)::numeric, 2); END IF;
  SELECT MAX(expected_completion_at) INTO v_estimated_delivery FROM public.order_production_progress WHERE order_id = p_order_id;
  UPDATE public.orders SET overall_progress_percentage = v_overall, estimated_delivery_at = COALESCE(v_estimated_delivery, estimated_delivery_at), updated_at = now() WHERE id = p_order_id;
  RETURN v_overall;
END; $$;

CREATE OR REPLACE FUNCTION public.seed_order_production_progress(p_order_id UUID, p_start_at TIMESTAMPTZ DEFAULT now()) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_cursor TIMESTAMPTZ := p_start_at; v_count INT := 0;
BEGIN
  FOR r IN SELECT id, default_duration_days, sort_order FROM public.production_stages WHERE is_active = true ORDER BY sort_order
  LOOP
    INSERT INTO public.order_production_progress (order_id, stage_id, percentage, status, expected_start_at, expected_completion_at)
    VALUES (p_order_id, r.id, 0, 'pending', v_cursor, v_cursor + (r.default_duration_days || ' days')::interval) ON CONFLICT (order_id, stage_id) DO NOTHING;
    v_cursor := v_cursor + (r.default_duration_days || ' days')::interval; v_count := v_count + 1;
  END LOOP;
  UPDATE public.orders SET production_started_at = COALESCE(production_started_at, p_start_at), estimated_delivery_at = COALESCE(estimated_delivery_at, v_cursor) WHERE id = p_order_id;
  PERFORM public.recalculate_order_progress(p_order_id);
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.create_wholesale_order(p_items JSONB, p_requested_delivery_date DATE DEFAULT NULL, p_atacadista_notes TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid(); v_wc public.wholesale_customers%ROWTYPE; v_customer_id UUID; v_order_id UUID; v_order_number INT; v_item JSONB; v_product RECORD; v_unit_price NUMERIC; v_qty INT; v_subtotal NUMERIC := 0; v_total_items INT := 0;
BEGIN
  SELECT * INTO v_wc FROM public.wholesale_customers WHERE user_id = v_user_id AND status = 'approved' LIMIT 1;
  IF v_wc.id IS NULL THEN RAISE EXCEPTION 'No approved wholesale customer linked to this user'; END IF;
  IF v_wc.customer_id IS NULL THEN INSERT INTO public.customers (user_id, name, email, phone, cpf_cnpj, company_name, is_company) VALUES (v_user_id, v_wc.contact_name, v_wc.email, v_wc.phone, v_wc.cnpj, v_wc.razao_social, true) RETURNING id INTO v_customer_id; UPDATE public.wholesale_customers SET customer_id = v_customer_id, updated_at = now() WHERE id = v_wc.id; ELSE v_customer_id := v_wc.customer_id; END IF;
  INSERT INTO public.orders (customer_id, status, payment_status, subtotal, total, sales_channel, wholesale_customer_id, requested_delivery_date, atacadista_notes) VALUES (v_customer_id, 'pending', 'pending', 0, 0, 'wholesale', v_wc.id, p_requested_delivery_date, p_atacadista_notes) RETURNING id, order_number INTO v_order_id, v_order_number;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::INT;
    SELECT id, name, sku, COALESCE(wholesale_price, price) AS price INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::UUID;
    v_unit_price := v_product.price;
    INSERT INTO public.order_items (order_id, product_id, product_name, sku, quantity, unit_price, total) VALUES (v_order_id, v_product.id, v_product.name, v_product.sku, v_qty, v_unit_price, v_unit_price * v_qty);
    v_subtotal := v_subtotal + (v_unit_price * v_qty); v_total_items := v_total_items + v_qty;
  END LOOP;
  UPDATE public.orders SET subtotal = v_subtotal, total = v_subtotal WHERE id = v_order_id;
  PERFORM public.seed_order_production_progress(v_order_id, now());
  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
END; $$;

CREATE OR REPLACE FUNCTION public.advance_order_stage_by_code(p_order_id UUID, p_stage_code TEXT, p_operator TEXT DEFAULT NULL) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stage_id UUID;
BEGIN
  SELECT id INTO v_stage_id FROM public.production_stages WHERE code = p_stage_code;
  IF v_stage_id IS NULL THEN RETURN FALSE; END IF;
  UPDATE public.order_production_progress SET percentage = 100, status = 'completed', completed_at = now(), operator_name = COALESCE(p_operator, operator_name) WHERE order_id = p_order_id AND stage_id = v_stage_id;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE VIEW public.wholesale_orders_summary AS SELECT o.id, o.order_number, o.status, o.payment_status, o.created_at, o.requested_delivery_date, o.production_started_at, o.estimated_delivery_at, o.overall_progress_percentage, o.subtotal, o.total, o.sales_channel, o.wholesale_customer_id, wc.user_id AS wholesale_user_id, wc.razao_social, wc.cnpj FROM public.orders o JOIN public.wholesale_customers wc ON wc.id = o.wholesale_customer_id WHERE o.sales_channel = 'wholesale';

-- 3. wholesale_login_by_cnpj
CREATE INDEX IF NOT EXISTS idx_wholesale_customers_cnpj_digits ON public.wholesale_customers ((regexp_replace(cnpj, '[^0-9]', '', 'g')));
CREATE INDEX IF NOT EXISTS idx_wholesale_customers_email_lower ON public.wholesale_customers (lower(email));
CREATE OR REPLACE FUNCTION public.get_wholesale_email_by_cnpj(p_cnpj TEXT) RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$ SELECT email FROM public.wholesale_customers WHERE regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g') = regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g') AND status = 'approved' AND user_id IS NOT NULL ORDER BY approved_at DESC NULLS LAST LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.get_wholesale_email_by_cnpj(TEXT) TO anon, authenticated;
ALTER TABLE public.wholesale_customers ADD COLUMN IF NOT EXISTS access_credentials_sent_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS access_credentials_delivery TEXT;
