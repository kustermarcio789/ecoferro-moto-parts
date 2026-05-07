-- =============================================
-- WHOLESALE LOGIN BY CNPJ + APPROVAL FLOW
-- =============================================
-- Habilita o atacadista a logar usando o CNPJ cadastrado.
-- O login na UI mostra "CNPJ ou e-mail" e, quando for CNPJ,
-- resolve o e-mail correspondente via RPC (security definer).

-- ---------- Indices para lookup ----------
CREATE INDEX IF NOT EXISTS idx_wholesale_customers_cnpj_digits
  ON public.wholesale_customers ((regexp_replace(cnpj, '[^0-9]', '', 'g')));

CREATE INDEX IF NOT EXISTS idx_wholesale_customers_email_lower
  ON public.wholesale_customers (lower(email));

-- ---------- RPC: resolve email pelo CNPJ ----------
-- Retorna NULL se nao houver cadastro aprovado e linkado.
-- Aceita CNPJ com ou sem formatacao (XX.XXX.XXX/XXXX-XX, XXXXXXXXXXXXXX, etc.)
CREATE OR REPLACE FUNCTION public.get_wholesale_email_by_cnpj(p_cnpj TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email
  FROM public.wholesale_customers
  WHERE regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g')
        = regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g')
    AND status = 'approved'
    AND user_id IS NOT NULL
  ORDER BY approved_at DESC NULLS LAST
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_wholesale_email_by_cnpj(TEXT) TO anon, authenticated;

-- ---------- Coluna opcional para acompanhar se a senha foi trocada ----------
ALTER TABLE public.wholesale_customers
  ADD COLUMN IF NOT EXISTS access_credentials_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_credentials_delivery TEXT
    CHECK (access_credentials_delivery IN ('manual', 'email', 'whatsapp'));
