-- Create RPC to recalculate order totals
CREATE OR REPLACE FUNCTION public.recalculate_order_totals(p_order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.orders SET
    subtotal = (SELECT COALESCE(SUM(total),0) FROM public.order_items WHERE order_id = p_order_id),
    total = (SELECT COALESCE(SUM(total),0) FROM public.order_items WHERE order_id = p_order_id) - COALESCE(discount,0) + COALESCE(shipping_cost,0),
    updated_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS policies for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage all items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND policyname = 'Admins manage order items'
    ) THEN
        CREATE POLICY "Admins manage order items" 
        ON public.order_items 
        FOR ALL 
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
