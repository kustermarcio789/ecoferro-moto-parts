
-- =============================================
-- B2B, AFFILIATES, WHOLESALE, PARTNERS TABLES
-- =============================================

-- Partners / Affiliates table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'affiliate' CHECK (type IN ('affiliate', 'reseller', 'commercial_partner', 'distributor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'approved', 'rejected', 'blocked')),
  company_name text,
  cnpj text,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  state text,
  segment text,
  commission_type text DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value numeric DEFAULT 0,
  referral_code text UNIQUE,
  coupon_code text,
  cookie_days integer DEFAULT 30,
  notes text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners view own" ON public.partners FOR SELECT USING (auth.uid() = user_id);

-- Partner stats (clicks, leads, orders tracking)
CREATE TABLE public.partner_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clicks integer DEFAULT 0,
  leads integer DEFAULT 0,
  orders integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  UNIQUE(partner_id, date)
);
ALTER TABLE public.partner_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner_stats" ON public.partner_stats FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners view own stats" ON public.partner_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_stats.partner_id AND p.user_id = auth.uid())
);

-- Commission payments
CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  period_start date,
  period_end date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage commission_payments" ON public.commission_payments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners view own payments" ON public.commission_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = commission_payments.partner_id AND p.user_id = auth.uid())
);

-- Wholesale customers
CREATE TABLE public.wholesale_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'approved', 'rejected', 'blocked')),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL,
  inscricao_estadual text,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text,
  state text,
  segment text,
  customer_type text DEFAULT 'wholesale' CHECK (customer_type IN ('retail', 'wholesale', 'reseller', 'distributor')),
  price_table_id uuid,
  min_order_value numeric DEFAULT 0,
  notes text,
  documents jsonb DEFAULT '[]'::jsonb,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wholesale_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wholesale" ON public.wholesale_customers FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Wholesale view own" ON public.wholesale_customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Wholesale insert" ON public.wholesale_customers FOR INSERT WITH CHECK (true);

-- Price tables
CREATE TABLE public.price_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage price_tables" ON public.price_tables FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Price tables readable by authenticated" ON public.price_tables FOR SELECT TO authenticated USING (is_active = true);

-- Volume discounts (quantity-based pricing)
CREATE TABLE public.volume_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  price_table_id uuid REFERENCES public.price_tables(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL DEFAULT 1,
  max_quantity integer,
  discount_percentage numeric NOT NULL DEFAULT 0,
  fixed_price numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.volume_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage volume_discounts" ON public.volume_discounts FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Volume discounts readable" ON public.volume_discounts FOR SELECT USING (is_active = true);

-- MOQ (minimum order quantity) rules
CREATE TABLE public.moq_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  customer_type text,
  min_quantity integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moq_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage moq_rules" ON public.moq_rules FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "MOQ rules readable" ON public.moq_rules FOR SELECT USING (is_active = true);

-- Profiles table for user data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles insertable" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add wholesale_only and moq fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_only boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS moq integer DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price numeric;

-- Add sales_channel to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sales_channel text DEFAULT 'retail' CHECK (sales_channel IN ('retail', 'wholesale', 'affiliate', 'partner'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Triggers for updated_at
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wholesale_customers_updated_at BEFORE UPDATE ON public.wholesale_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
