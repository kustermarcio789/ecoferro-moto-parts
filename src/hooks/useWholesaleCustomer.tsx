import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WholesaleCustomer {
  id: string;
  user_id: string | null;
  customer_id: string | null;
  status: "pending" | "analyzing" | "approved" | "rejected" | "blocked";
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  segment: string | null;
  customer_type: string;
  min_order_value: number | null;
  approved_at: string | null;
  created_at: string;
}

export function useWholesaleCustomer() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<WholesaleCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("wholesale_customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(async ({ data: byUser }) => {
        if (cancelled) return;
        if (byUser) {
          setData(byUser as WholesaleCustomer);
          setLoading(false);
          return;
        }
        // fallback: try to auto-link by email
        if (user.email) {
          const { data: linkedId } = await supabase.rpc("link_wholesale_to_current_user", {
            p_email: user.email,
          });
          if (linkedId) {
            const { data: linked } = await supabase
              .from("wholesale_customers")
              .select("*")
              .eq("id", linkedId)
              .maybeSingle();
            if (!cancelled && linked) {
              setData(linked as WholesaleCustomer);
              setLoading(false);
              return;
            }
          }
        }
        setData(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { wholesaleCustomer: data, loading: loading || authLoading };
}
