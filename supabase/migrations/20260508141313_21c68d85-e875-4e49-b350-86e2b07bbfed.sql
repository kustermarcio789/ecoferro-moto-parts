-- 7. RPC: link wholesale_customer to current user (after signup)
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
