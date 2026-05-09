CREATE OR REPLACE FUNCTION public.create_wholesale_order(
  p_items jsonb, 
  p_requested_delivery_date date DEFAULT NULL::date, 
  p_atacadista_notes text DEFAULT NULL::text,
  p_priority text DEFAULT 'normal'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Validate priority
  IF p_priority NOT IN ('normal', 'urgent', 'critical') THEN
    RAISE EXCEPTION 'Prioridade inválida. Use: normal, urgent ou critical.';
  END IF;

  SELECT * INTO v_wc FROM public.wholesale_customers WHERE user_id = v_user_id AND status = 'approved' LIMIT 1;
  IF v_wc.id IS NULL THEN RAISE EXCEPTION 'No approved wholesale customer linked to this user'; END IF;
  
  IF v_wc.customer_id IS NULL THEN 
    INSERT INTO public.customers (user_id, name, email, phone, cpf_cnpj, company_name, is_company) 
    VALUES (v_user_id, v_wc.contact_name, v_wc.email, v_wc.phone, v_wc.cnpj, v_wc.razao_social, true) 
    RETURNING id INTO v_customer_id; 
    
    UPDATE public.wholesale_customers SET customer_id = v_customer_id, updated_at = now() WHERE id = v_wc.id; 
  ELSE 
    v_customer_id := v_wc.customer_id; 
  END IF;

  INSERT INTO public.orders (
    customer_id, status, payment_status, subtotal, total, 
    sales_channel, wholesale_customer_id, requested_delivery_date, 
    atacadista_notes, priority
  ) VALUES (
    v_customer_id, 'pending', 'pending', 0, 0, 
    'wholesale', v_wc.id, p_requested_delivery_date, 
    p_atacadista_notes, p_priority
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

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
END; $function$;