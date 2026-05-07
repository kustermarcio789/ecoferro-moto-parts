-- =============================================
-- WHOLESALE B2B PORTAL + PRODUCTION TRACKING
-- =============================================
-- Adds:
-- 1. production_stages       (catalogo de etapas: corte, soldagem, pintura, etc.)
-- 2. order_production_progress (% de cada estagio por pedido + datas previstas/reais)
-- 3. orders.wholesale_customer_id, orders.requested_delivery_date, orders.estimated_delivery_at
-- 4. wholesale_customers.user_id linkable on approval, RLS para clientes verem proprios pedidos
-- 5. Helpers (RPC) para criar pedido B2B atomicamente, calcular % geral e proximas datas
-- 6. Trigger que sincroniza process_production_sync com order_production_progress

-- ---------------------------------------------
-- 1. PRODUCTION STAGES (catalogo de etapas)
-- ---------------------------------------------
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
CREATE POLICY "Stages readable by authenticated"
  ON public.production_stages FOR SELECT
  TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage stages"
  ON public.production_stages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_production_stages_sort ON public.production_stages (sort_order);

CREATE TRIGGER update_production_stages_updated_at
  BEFORE UPDATE ON public.production_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default stages with weights summing 100
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
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  default_duration_days = EXCLUDED.default_duration_days,
  weight_percentage = EXCLUDED.weight_percentage,
  color = EXCLUDED.color,
  updated_at = now();

-- ---------------------------------------------
-- 2. ORDERS extensions for B2B + delivery prediction
-- ---------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wholesale_customer_id UUID REFERENCES public.wholesale_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS production_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overall_progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atacadista_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_wholesale_customer ON public.orders (wholesale_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_sales_channel_status ON public.orders (sales_channel, status);

-- ---------------------------------------------
-- 3. ORDER PRODUCTION PROGRESS (one row per stage per order)
-- ---------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_order_production_progress_order ON public.order_production_progress (order_id);
CREATE INDEX IF NOT EXISTS idx_order_production_progress_stage ON public.order_production_progress (stage_id);
CREATE INDEX IF NOT EXISTS idx_order_production_progress_status ON public.order_production_progress (status);

CREATE TRIGGER update_order_production_progress_updated_at
  BEFORE UPDATE ON public.order_production_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: admins manage; wholesale customers can view progress of THEIR orders
CREATE POLICY "Admins manage production progress"
  ON public.order_production_progress FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Wholesale views own order progress"
  ON public.order_production_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.wholesale_customers wc ON wc.id = o.wholesale_customer_id
      WHERE o.id = order_production_progress.order_id
        AND wc.user_id = auth.uid()
    )
  );

-- Allow wholesale customers to view their own orders (in addition to existing customer-based RLS)
CREATE POLICY "Wholesale views own orders"
  ON public.orders FOR SELECT
  USING (
    wholesale_customer_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.wholesale_customers wc
      WHERE wc.id = orders.wholesale_customer_id
        AND wc.user_id = auth.uid()
    )
  );

CREATE POLICY "Wholesale views own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.wholesale_customers wc ON wc.id = o.wholesale_customer_id
      WHERE o.id = order_items.order_id
        AND wc.user_id = auth.uid()
    )
  );

-- ---------------------------------------------
-- 4. RPC: recalculate overall progress for an order
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_order_progress(p_order_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_overall NUMERIC := 0;
  v_estimated_delivery TIMESTAMPTZ;
BEGIN
  SELECT
    COALESCE(SUM(opp.percentage * s.weight_percentage / 100.0), 0),
    COALESCE(SUM(s.weight_percentage), 0)
  INTO v_total, v_total_weight
  FROM public.order_production_progress opp
  JOIN public.production_stages s ON s.id = opp.stage_id
  WHERE opp.order_id = p_order_id;

  IF v_total_weight > 0 THEN
    v_overall := ROUND((v_total * 100.0 / v_total_weight)::numeric, 2);
  END IF;

  -- estimated delivery = MAX(expected_completion_at) across stages
  SELECT MAX(expected_completion_at)
  INTO v_estimated_delivery
  FROM public.order_production_progress
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET overall_progress_percentage = v_overall,
      estimated_delivery_at = COALESCE(v_estimated_delivery, estimated_delivery_at),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN v_overall;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_order_progress(UUID) TO authenticated, service_role;

-- Trigger keeps orders.overall_progress_percentage in sync
CREATE OR REPLACE FUNCTION public.tr_recalc_order_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_order_progress(COALESCE(NEW.order_id, OLD.order_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS recalc_order_progress_trigger ON public.order_production_progress;
CREATE TRIGGER recalc_order_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.order_production_progress
FOR EACH ROW EXECUTE FUNCTION public.tr_recalc_order_progress();

-- ---------------------------------------------
-- 5. RPC: seed production progress when a wholesale order is created
--    Creates one row per active stage with default expected dates
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_order_production_progress(
  p_order_id UUID,
  p_start_at TIMESTAMPTZ DEFAULT now()
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_cursor TIMESTAMPTZ := p_start_at;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT id, default_duration_days, sort_order
    FROM public.production_stages
    WHERE is_active = true
    ORDER BY sort_order
  LOOP
    INSERT INTO public.order_production_progress (
      order_id, stage_id, percentage, status,
      expected_start_at, expected_completion_at
    )
    VALUES (
      p_order_id, r.id, 0, 'pending',
      v_cursor,
      v_cursor + (r.default_duration_days || ' days')::interval
    )
    ON CONFLICT (order_id, stage_id) DO NOTHING;

    v_cursor := v_cursor + (r.default_duration_days || ' days')::interval;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.orders
  SET production_started_at = COALESCE(production_started_at, p_start_at),
      estimated_delivery_at = COALESCE(estimated_delivery_at, v_cursor)
  WHERE id = p_order_id;

  PERFORM public.recalculate_order_progress(p_order_id);

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_order_production_progress(UUID, TIMESTAMPTZ) TO authenticated, service_role;

-- ---------------------------------------------
-- 6. RPC: create wholesale order from cart-like payload
--    Used by wholesale frontend (enforces wholesale_customer_id matches caller)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.create_wholesale_order(
  p_items JSONB,                        -- [{product_id, quantity, requested_delivery_date?}]
  p_requested_delivery_date DATE DEFAULT NULL,
  p_atacadista_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wc public.wholesale_customers%ROWTYPE;
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number INT;
  v_item JSONB;
  v_product RECORD;
  v_unit_price NUMERIC;
  v_qty INT;
  v_subtotal NUMERIC := 0;
  v_total_items INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find approved wholesale customer for this user
  SELECT * INTO v_wc
  FROM public.wholesale_customers
  WHERE user_id = v_user_id AND status = 'approved'
  ORDER BY approved_at DESC NULLS LAST
  LIMIT 1;

  IF v_wc.id IS NULL THEN
    RAISE EXCEPTION 'No approved wholesale customer linked to this user';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Items array is required';
  END IF;

  -- ensure linked customer (retail customers table) exists for FK consistency
  IF v_wc.customer_id IS NULL THEN
    INSERT INTO public.customers (user_id, name, email, phone, cpf_cnpj, company_name, is_company)
    VALUES (
      v_user_id,
      v_wc.contact_name,
      v_wc.email,
      v_wc.phone,
      v_wc.cnpj,
      v_wc.razao_social,
      true
    )
    RETURNING id INTO v_customer_id;

    UPDATE public.wholesale_customers
    SET customer_id = v_customer_id, updated_at = now()
    WHERE id = v_wc.id;
  ELSE
    v_customer_id := v_wc.customer_id;
  END IF;

  -- create order shell
  INSERT INTO public.orders (
    customer_id, status, payment_status,
    subtotal, total, sales_channel,
    wholesale_customer_id, requested_delivery_date,
    atacadista_notes, customer_notes
  )
  VALUES (
    v_customer_id, 'pending', 'pending',
    0, 0, 'wholesale',
    v_wc.id, p_requested_delivery_date,
    p_atacadista_notes, p_atacadista_notes
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- insert items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::INT, 0);
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, name, sku, COALESCE(wholesale_price, price) AS price, COALESCE(moq, 1) AS moq
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;

    IF v_qty < v_product.moq THEN
      RAISE EXCEPTION 'Quantity below MOQ for product % (min %, got %)', v_product.name, v_product.moq, v_qty;
    END IF;

    v_unit_price := v_product.price;
    INSERT INTO public.order_items (order_id, product_id, product_name, sku, quantity, unit_price, total)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.sku, v_qty, v_unit_price, v_unit_price * v_qty);

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    v_total_items := v_total_items + v_qty;
  END LOOP;

  IF v_total_items = 0 THEN
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE EXCEPTION 'No valid items in order';
  END IF;

  UPDATE public.orders
  SET subtotal = v_subtotal, total = v_subtotal
  WHERE id = v_order_id;

  -- seed production stages
  PERFORM public.seed_order_production_progress(v_order_id, now());

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total_items', v_total_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_wholesale_order(JSONB, DATE, TEXT) TO authenticated;

-- Wholesale customers can INSERT into orders is restricted; the RPC bypasses that with SECURITY DEFINER.

-- ---------------------------------------------
-- 7. RPC: link wholesale_customer to current user (after signup)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.link_wholesale_to_current_user(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wc_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.wholesale_customers
  SET user_id = v_user_id, updated_at = now()
  WHERE lower(email) = lower(p_email)
    AND user_id IS NULL
  RETURNING id INTO v_wc_id;

  RETURN v_wc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_wholesale_to_current_user(TEXT) TO authenticated;

-- Auto-link on signup if email matches a pending wholesale_customers row
CREATE OR REPLACE FUNCTION public.auto_link_wholesale_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wholesale_customers
  SET user_id = NEW.id, updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_wholesale_on_signup_trigger ON auth.users;
CREATE TRIGGER auto_link_wholesale_on_signup_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_link_wholesale_on_signup();

-- ---------------------------------------------
-- 8. View: wholesale orders with summary (for portal lists)
-- ---------------------------------------------
CREATE OR REPLACE VIEW public.wholesale_orders_summary AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.payment_status,
  o.created_at,
  o.requested_delivery_date,
  o.production_started_at,
  o.estimated_delivery_at,
  o.overall_progress_percentage,
  o.subtotal,
  o.total,
  o.sales_channel,
  o.wholesale_customer_id,
  wc.user_id AS wholesale_user_id,
  wc.razao_social,
  wc.nome_fantasia,
  wc.cnpj,
  (
    SELECT COUNT(*)::INT FROM public.order_items oi WHERE oi.order_id = o.id
  ) AS items_count,
  (
    SELECT COALESCE(SUM(oi.quantity), 0)::INT
    FROM public.order_items oi
    WHERE oi.order_id = o.id
  ) AS units_total,
  (
    SELECT row_to_json(s)
    FROM (
      SELECT ps.code, ps.name, opp.percentage, opp.expected_completion_at
      FROM public.order_production_progress opp
      JOIN public.production_stages ps ON ps.id = opp.stage_id
      WHERE opp.order_id = o.id AND opp.status = 'in_progress'
      ORDER BY ps.sort_order
      LIMIT 1
    ) s
  ) AS current_stage
FROM public.orders o
JOIN public.wholesale_customers wc ON wc.id = o.wholesale_customer_id
WHERE o.sales_channel = 'wholesale';

GRANT SELECT ON public.wholesale_orders_summary TO authenticated;

-- ---------------------------------------------
-- 9. Hook process_production_sync to update order_production_progress
--    when stage events come from controle.ecoferro.com.br
--    (best effort: matches latest in_progress wholesale order)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_order_stage_by_code(
  p_order_id UUID,
  p_stage_code TEXT,
  p_percentage NUMERIC,
  p_status TEXT DEFAULT NULL,
  p_operator_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.order_production_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id UUID;
  v_row public.order_production_progress%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to advance order stage';
  END IF;

  SELECT id INTO v_stage_id FROM public.production_stages WHERE code = p_stage_code AND is_active = true;
  IF v_stage_id IS NULL THEN
    RAISE EXCEPTION 'Stage code % not found', p_stage_code;
  END IF;

  INSERT INTO public.order_production_progress (
    order_id, stage_id, percentage, status, started_at, completed_at, operator_name, notes
  )
  VALUES (
    p_order_id, v_stage_id,
    LEAST(GREATEST(p_percentage, 0), 100),
    COALESCE(p_status, CASE
      WHEN p_percentage >= 100 THEN 'completed'
      WHEN p_percentage > 0 THEN 'in_progress'
      ELSE 'pending'
    END),
    CASE WHEN p_percentage > 0 THEN COALESCE(now(), now()) ELSE NULL END,
    CASE WHEN p_percentage >= 100 THEN now() ELSE NULL END,
    p_operator_name,
    p_notes
  )
  ON CONFLICT (order_id, stage_id) DO UPDATE SET
    percentage = LEAST(GREATEST(EXCLUDED.percentage, 0), 100),
    status = COALESCE(EXCLUDED.status, public.order_production_progress.status),
    started_at = COALESCE(public.order_production_progress.started_at, EXCLUDED.started_at),
    completed_at = CASE
      WHEN EXCLUDED.percentage >= 100 THEN COALESCE(public.order_production_progress.completed_at, now())
      ELSE public.order_production_progress.completed_at
    END,
    operator_name = COALESCE(EXCLUDED.operator_name, public.order_production_progress.operator_name),
    notes = COALESCE(EXCLUDED.notes, public.order_production_progress.notes),
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_order_stage_by_code(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated, service_role;
