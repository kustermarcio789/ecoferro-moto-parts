-- =============================================
-- ECOFERRO INVENTORY INTEGRATION HARDENING
-- =============================================

ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'entry_from_production';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'sale';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'manual_adjustment';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'damaged_loss';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'cancellation_reversal';
ALTER TYPE public.inventory_movement_type ADD VALUE IF NOT EXISTS 'release_reservation';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS internal_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_internal_code_unique
  ON public.products (lower(internal_code))
  WHERE internal_code IS NOT NULL;

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

CREATE POLICY "Admins manage inventory balances"
  ON public.inventory_balances
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

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

CREATE POLICY "Admins manage product mappings"
  ON public.product_external_mappings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_external_mappings_product_id_source
  ON public.product_external_mappings (product_id, source_system);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_external_mappings_external_product_id
  ON public.product_external_mappings (source_system, external_product_id)
  WHERE external_product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_external_mappings_external_code
  ON public.product_external_mappings (source_system, external_code)
  WHERE external_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_external_mappings_external_sku
  ON public.product_external_mappings (source_system, external_sku)
  WHERE external_sku IS NOT NULL;

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

CREATE POLICY "Admins manage integration logs"
  ON public.integration_logs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_logs_source_event
  ON public.integration_logs (source_system, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_logs_status_created_at
  ON public.integration_logs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_source_created_at
  ON public.integration_logs (source_system, created_at DESC);

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS source_system TEXT,
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS external_event_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_reserved INT,
  ADD COLUMN IF NOT EXISTS new_reserved INT,
  ADD COLUMN IF NOT EXISTS integration_log_id UUID REFERENCES public.integration_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created_at
  ON public.inventory_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id
  ON public.inventory_movements (order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_channel
  ON public.inventory_movements (channel);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_sales_channel_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_sales_channel_check
  CHECK (
    sales_channel IS NULL
    OR sales_channel IN (
      'website',
      'atacado',
      'mercado_livre',
      'barracao',
      'other',
      'retail',
      'wholesale',
      'affiliate',
      'partner'
    )
  );

INSERT INTO public.inventory_balances (
  product_id,
  available_quantity,
  reserved_quantity,
  damaged_quantity,
  low_stock_threshold,
  last_movement_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  GREATEST(COALESCE(p.stock, 0), 0),
  0,
  0,
  COALESCE(p.min_stock, 5),
  now(),
  now(),
  now()
FROM public.products p
ON CONFLICT (product_id) DO UPDATE
SET
  available_quantity = EXCLUDED.available_quantity,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  updated_at = now();

INSERT INTO public.product_external_mappings (
  product_id,
  source_system,
  external_product_id,
  metadata
)
SELECT
  p.id,
  'mercado_livre',
  p.ml_id,
  jsonb_build_object('seeded_from', 'products.ml_id')
FROM public.products p
WHERE p.ml_id IS NOT NULL
ON CONFLICT (source_system, external_product_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_inventory_balance_to_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET
    stock = NEW.available_quantity,
    min_stock = NEW.low_stock_threshold
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_inventory_balance_for_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_balances (
    product_id,
    available_quantity,
    reserved_quantity,
    damaged_quantity,
    low_stock_threshold,
    last_movement_at
  )
  VALUES (
    NEW.id,
    GREATEST(COALESCE(NEW.stock, 0), 0),
    0,
    0,
    COALESCE(NEW.min_stock, 5),
    now()
  )
  ON CONFLICT (product_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_threshold_to_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.min_stock, 5) IS DISTINCT FROM COALESCE(OLD.min_stock, 5) THEN
    UPDATE public.inventory_balances
    SET
      low_stock_threshold = COALESCE(NEW.min_stock, 5),
      updated_at = now()
    WHERE product_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_inventory_balance_to_product_trigger ON public.inventory_balances;
CREATE TRIGGER sync_inventory_balance_to_product_trigger
AFTER INSERT OR UPDATE ON public.inventory_balances
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_balance_to_product();

DROP TRIGGER IF EXISTS ensure_inventory_balance_for_product_trigger ON public.products;
CREATE TRIGGER ensure_inventory_balance_for_product_trigger
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.ensure_inventory_balance_for_product();

DROP TRIGGER IF EXISTS sync_product_threshold_to_inventory_trigger ON public.products;
CREATE TRIGGER sync_product_threshold_to_inventory_trigger
AFTER UPDATE OF min_stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_threshold_to_inventory();

CREATE OR REPLACE FUNCTION public._record_inventory_movement(
  p_product_id UUID,
  p_type public.inventory_movement_type,
  p_quantity INT,
  p_reason TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_source_system TEXT DEFAULT 'admin',
  p_source_reference TEXT DEFAULT NULL,
  p_external_event_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_integration_log_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.inventory_balances%ROWTYPE;
  v_product_name TEXT;
  v_previous_available INT;
  v_previous_reserved INT;
  v_previous_damaged INT;
  v_available_delta INT := 0;
  v_reserved_delta INT := 0;
  v_damaged_delta INT := 0;
  v_new_available INT;
  v_new_reserved INT;
  v_new_damaged INT;
  v_movement_id UUID;
BEGIN
  IF p_type IN ('adjustment', 'manual_adjustment') THEN
    IF p_quantity = 0 THEN
      RAISE EXCEPTION 'Adjustment quantity cannot be zero';
    END IF;
  ELSIF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero for movement type %', p_type;
  END IF;

  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = p_product_id;

  IF v_product_name IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  SELECT *
  INTO v_balance
  FROM public.inventory_balances
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_balances (
      product_id,
      available_quantity,
      reserved_quantity,
      damaged_quantity,
      low_stock_threshold,
      last_movement_at
    )
    SELECT
      p.id,
      GREATEST(COALESCE(p.stock, 0), 0),
      0,
      0,
      COALESCE(p.min_stock, 5),
      now()
    FROM public.products p
    WHERE p.id = p_product_id
    ON CONFLICT (product_id) DO NOTHING;

    SELECT *
    INTO v_balance
    FROM public.inventory_balances
    WHERE product_id = p_product_id
    FOR UPDATE;
  END IF;

  v_previous_available := COALESCE(v_balance.available_quantity, 0);
  v_previous_reserved := COALESCE(v_balance.reserved_quantity, 0);
  v_previous_damaged := COALESCE(v_balance.damaged_quantity, 0);

  CASE p_type
    WHEN 'entry' THEN
      v_available_delta := ABS(p_quantity);
    WHEN 'entry_from_production' THEN
      v_available_delta := ABS(p_quantity);
    WHEN 'return' THEN
      v_available_delta := ABS(p_quantity);
    WHEN 'cancellation_reversal' THEN
      v_available_delta := ABS(p_quantity);
    WHEN 'exit' THEN
      v_available_delta := ABS(p_quantity) * -1;
    WHEN 'sale' THEN
      v_available_delta := ABS(p_quantity) * -1;
    WHEN 'damaged_loss' THEN
      v_available_delta := ABS(p_quantity) * -1;
      v_damaged_delta := ABS(p_quantity);
    WHEN 'reservation' THEN
      v_available_delta := ABS(p_quantity) * -1;
      v_reserved_delta := ABS(p_quantity);
    WHEN 'release_reservation' THEN
      v_available_delta := ABS(p_quantity);
      v_reserved_delta := ABS(p_quantity) * -1;
    WHEN 'adjustment' THEN
      v_available_delta := p_quantity;
    WHEN 'manual_adjustment' THEN
      v_available_delta := p_quantity;
    ELSE
      RAISE EXCEPTION 'Unsupported inventory movement type %', p_type;
  END CASE;

  v_new_available := v_previous_available + v_available_delta;
  v_new_reserved := v_previous_reserved + v_reserved_delta;
  v_new_damaged := v_previous_damaged + v_damaged_delta;

  IF v_new_available < 0 THEN
    RAISE EXCEPTION 'Insufficient available stock for product % (%). Current available: %, requested delta: %',
      p_product_id, v_product_name, v_previous_available, v_available_delta;
  END IF;

  IF v_new_reserved < 0 THEN
    RAISE EXCEPTION 'Reserved stock would become negative for product % (%)',
      p_product_id, v_product_name;
  END IF;

  IF v_new_damaged < 0 THEN
    RAISE EXCEPTION 'Damaged stock would become negative for product % (%)',
      p_product_id, v_product_name;
  END IF;

  UPDATE public.inventory_balances
  SET
    available_quantity = v_new_available,
    reserved_quantity = v_new_reserved,
    damaged_quantity = v_new_damaged,
    last_movement_at = now(),
    updated_at = now()
  WHERE product_id = p_product_id;

  INSERT INTO public.inventory_movements (
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    previous_reserved,
    new_reserved,
    reason,
    order_id,
    created_by,
    channel,
    source_system,
    source_reference,
    external_event_id,
    metadata,
    integration_log_id
  )
  VALUES (
    p_product_id,
    p_type,
    p_quantity,
    v_previous_available,
    v_new_available,
    v_previous_reserved,
    v_new_reserved,
    p_reason,
    p_order_id,
    COALESCE(p_created_by, auth.uid()),
    p_channel,
    p_source_system,
    p_source_reference,
    p_external_event_id,
    COALESCE(p_metadata, '{}'::jsonb),
    p_integration_log_id
  )
  RETURNING id INTO v_movement_id;

  INSERT INTO public.admin_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    COALESCE(p_created_by, auth.uid()),
    'inventory.' || p_type::TEXT,
    'product',
    p_product_id::TEXT,
    jsonb_build_object(
      'movement_id', v_movement_id,
      'product_name', v_product_name,
      'quantity', p_quantity,
      'channel', p_channel,
      'source_system', p_source_system,
      'source_reference', p_source_reference,
      'previous_available', v_previous_available,
      'new_available', v_new_available,
      'previous_reserved', v_previous_reserved,
      'new_reserved', v_new_reserved
    )
  );

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'product_id', p_product_id,
    'product_name', v_product_name,
    'available_quantity', v_new_available,
    'reserved_quantity', v_new_reserved,
    'damaged_quantity', v_new_damaged
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  p_product_id UUID,
  p_type public.inventory_movement_type,
  p_quantity INT,
  p_reason TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_source_system TEXT DEFAULT 'admin',
  p_source_reference TEXT DEFAULT NULL,
  p_external_event_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_integration_log_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to record inventory movements';
  END IF;

  RETURN public._record_inventory_movement(
    p_product_id,
    p_type,
    p_quantity,
    p_reason,
    p_channel,
    p_order_id,
    p_created_by,
    p_source_system,
    p_source_reference,
    p_external_event_id,
    p_metadata,
    p_integration_log_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_order_inventory(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_processed_count INT := 0;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.status IN ('cancelled', 'refunded') THEN
    RETURN jsonb_build_object(
      'status', 'ignored',
      'reason', 'order_not_active',
      'order_id', p_order_id
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_movements
    WHERE order_id = p_order_id
      AND type = 'sale'
  ) THEN
    RETURN jsonb_build_object(
      'status', 'already_processed',
      'order_id', p_order_id
    );
  END IF;

  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.quantity, oi.product_name
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    PERFORM public._record_inventory_movement(
      p_product_id => v_item.product_id,
      p_type => 'sale',
      p_quantity => v_item.quantity,
      p_reason => 'Venda - Pedido #' || v_order.order_number,
      p_channel => COALESCE(v_order.sales_channel, 'website'),
      p_order_id => p_order_id,
      p_created_by => NULL,
      p_source_system => 'ecoferro-admin',
      p_source_reference => v_order.order_number::TEXT,
      p_external_event_id => 'order-sale-' || p_order_id::TEXT || '-' || v_item.id::TEXT,
      p_metadata => jsonb_build_object(
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'product_name', v_item.product_name
      )
    );

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'processed',
    'order_id', p_order_id,
    'processed_items', v_processed_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_status_with_inventory(
  p_order_id UUID,
  p_status public.order_status,
  p_changed_by UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_updates JSONB := '{}'::jsonb;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to update orders';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.status = p_status THEN
    RETURN jsonb_build_object(
      'status', 'unchanged',
      'order_id', p_order_id
    );
  END IF;

  IF p_status IN ('cancelled', 'refunded')
     AND v_order.status NOT IN ('cancelled', 'refunded') THEN
    FOR v_item IN
      SELECT oi.id, oi.product_id, oi.quantity, oi.product_name
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
    LOOP
      PERFORM public._record_inventory_movement(
        p_product_id => v_item.product_id,
        p_type => 'cancellation_reversal',
        p_quantity => v_item.quantity,
        p_reason => 'Reversao de estoque - Pedido #' || v_order.order_number,
        p_channel => COALESCE(v_order.sales_channel, 'website'),
        p_order_id => p_order_id,
        p_created_by => p_changed_by,
        p_source_system => 'ecoferro-admin',
        p_source_reference => v_order.order_number::TEXT,
        p_external_event_id => 'order-reversal-' || p_order_id::TEXT || '-' || v_item.id::TEXT,
        p_metadata => jsonb_build_object(
          'order_id', p_order_id,
          'order_number', v_order.order_number,
          'product_name', v_item.product_name,
          'new_status', p_status
        )
      );
    END LOOP;
  ELSIF v_order.status IN ('cancelled', 'refunded')
        AND p_status NOT IN ('cancelled', 'refunded') THEN
    FOR v_item IN
      SELECT oi.id, oi.product_id, oi.quantity, oi.product_name
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
    LOOP
      PERFORM public._record_inventory_movement(
        p_product_id => v_item.product_id,
        p_type => 'sale',
        p_quantity => v_item.quantity,
        p_reason => 'Reativacao de estoque comprometido - Pedido #' || v_order.order_number,
        p_channel => COALESCE(v_order.sales_channel, 'website'),
        p_order_id => p_order_id,
        p_created_by => p_changed_by,
        p_source_system => 'ecoferro-admin',
        p_source_reference => v_order.order_number::TEXT,
        p_external_event_id => 'order-reactivation-' || p_order_id::TEXT || '-' || v_item.id::TEXT,
        p_metadata => jsonb_build_object(
          'order_id', p_order_id,
          'order_number', v_order.order_number,
          'product_name', v_item.product_name,
          'new_status', p_status
        )
      );
    END LOOP;
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    paid_at = CASE
      WHEN p_status = 'paid' AND paid_at IS NULL THEN now()
      ELSE paid_at
    END,
    shipped_at = CASE
      WHEN p_status = 'shipped' AND shipped_at IS NULL THEN now()
      ELSE shipped_at
    END,
    delivered_at = CASE
      WHEN p_status = 'delivered' AND delivered_at IS NULL THEN now()
      ELSE delivered_at
    END,
    cancelled_at = CASE
      WHEN p_status IN ('cancelled', 'refunded') AND cancelled_at IS NULL THEN now()
      WHEN p_status NOT IN ('cancelled', 'refunded') THEN NULL
      ELSE cancelled_at
    END
  WHERE id = p_order_id;

  INSERT INTO public.admin_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    p_changed_by,
    'order.status_changed',
    'order',
    p_order_id::TEXT,
    jsonb_build_object(
      'previous_status', v_order.status,
      'new_status', p_status,
      'order_number', v_order.order_number
    )
  );

  RETURN jsonb_build_object(
    'status', 'updated',
    'order_id', p_order_id,
    'previous_status', v_order.status,
    'new_status', p_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_production_sync(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_system TEXT := COALESCE(NULLIF(p_payload->>'source_system', ''), 'controle.ecoferro.com.br');
  v_source_reference TEXT := NULLIF(p_payload->>'source_reference', '');
  v_external_event_id TEXT := COALESCE(NULLIF(p_payload->>'event_id', ''), NULLIF(p_payload->>'source_reference', ''));
  v_product_code TEXT := NULLIF(p_payload->>'product_code', '');
  v_sku TEXT := NULLIF(p_payload->>'sku', '');
  v_external_product_id TEXT := NULLIF(p_payload->>'external_product_id', '');
  v_stage TEXT := NULLIF(p_payload->>'stage', '');
  v_operator_name TEXT := COALESCE(NULLIF(p_payload#>>'{operator,name}', ''), NULLIF(p_payload->>'operator', ''));
  v_quantity INT := COALESCE(NULLIF(p_payload->>'quantity', '')::INT, 0);
  v_log public.integration_logs%ROWTYPE;
  v_product_id UUID;
  v_mapping_id UUID;
  v_result JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Production sync is restricted to service role';
  END IF;

  IF v_source_reference IS NULL THEN
    RAISE EXCEPTION 'source_reference is required';
  END IF;

  IF v_quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be greater than zero';
  END IF;

  SELECT *
  INTO v_log
  FROM public.integration_logs
  WHERE source_system = v_source_system
    AND external_event_id = v_external_event_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.integration_logs
    SET
      attempts = attempts + 1,
      request_payload = p_payload,
      updated_at = now()
    WHERE id = v_log.id
    RETURNING * INTO v_log;

    IF v_log.status = 'processed' THEN
      RETURN jsonb_build_object(
        'status', 'duplicate',
        'integration_log_id', v_log.id,
        'source_reference', v_source_reference
      );
    END IF;
  ELSE
    INSERT INTO public.integration_logs (
      integration_key,
      source_system,
      destination_system,
      direction,
      event_type,
      status,
      external_event_id,
      source_reference,
      product_code,
      sku,
      quantity,
      stage,
      operator_name,
      request_payload
    )
    VALUES (
      'production-final-stage',
      v_source_system,
      'ecoferro-admin',
      'inbound',
      'finished_goods_entry',
      'pending',
      v_external_event_id,
      v_source_reference,
      v_product_code,
      v_sku,
      v_quantity,
      v_stage,
      v_operator_name,
      p_payload
    )
    RETURNING * INTO v_log;
  END IF;

  IF v_external_product_id IS NOT NULL THEN
    SELECT m.product_id, m.id
    INTO v_product_id, v_mapping_id
    FROM public.product_external_mappings m
    WHERE m.source_system = v_source_system
      AND m.external_product_id = v_external_product_id
      AND m.is_active = true
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL AND v_product_code IS NOT NULL THEN
    SELECT m.product_id, m.id
    INTO v_product_id, v_mapping_id
    FROM public.product_external_mappings m
    WHERE m.source_system = v_source_system
      AND m.external_code = v_product_code
      AND m.is_active = true
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL AND v_sku IS NOT NULL THEN
    SELECT m.product_id, m.id
    INTO v_product_id, v_mapping_id
    FROM public.product_external_mappings m
    WHERE m.source_system = v_source_system
      AND m.external_sku = v_sku
      AND m.is_active = true
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL AND v_product_code IS NOT NULL THEN
    SELECT p.id
    INTO v_product_id
    FROM public.products p
    WHERE p.internal_code = v_product_code
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL AND v_sku IS NOT NULL THEN
    SELECT p.id
    INTO v_product_id
    FROM public.products p
    WHERE p.sku = v_sku
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL THEN
    UPDATE public.integration_logs
    SET
      status = 'failed',
      error_message = 'Product mapping not found in admin catalog',
      updated_at = now()
    WHERE id = v_log.id;

    RETURN jsonb_build_object(
      'status', 'failed',
      'integration_log_id', v_log.id,
      'error', 'Product mapping not found'
    );
  END IF;

  v_result := public._record_inventory_movement(
    p_product_id => v_product_id,
    p_type => 'entry_from_production',
    p_quantity => v_quantity,
    p_reason => 'Entrada de producao finalizada' || COALESCE(' - ' || v_stage, ''),
    p_channel => 'production',
    p_order_id => NULL,
    p_created_by => NULL,
    p_source_system => v_source_system,
    p_source_reference => v_source_reference,
    p_external_event_id => v_external_event_id,
    p_metadata => p_payload,
    p_integration_log_id => v_log.id
  );

  UPDATE public.integration_logs
  SET
    status = 'processed',
    product_id = v_product_id,
    product_mapping_id = v_mapping_id,
    response_payload = v_result,
    processed_at = now(),
    error_message = NULL,
    updated_at = now()
  WHERE id = v_log.id;

  RETURN jsonb_build_object(
    'status', 'processed',
    'integration_log_id', v_log.id,
    'product_id', v_product_id,
    'result', v_result
  );
END;
$$;

REVOKE ALL ON FUNCTION public._record_inventory_movement(UUID, public.inventory_movement_type, INT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_inventory_movement(UUID, public.inventory_movement_type, INT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_order_inventory(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status_with_inventory(UUID, public.order_status, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_production_sync(JSONB) TO service_role;
