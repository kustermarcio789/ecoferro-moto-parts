import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList } from "lucide-react";
import WholesalePortalLayout from "@/components/wholesale/WholesalePortalLayout";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaleCustomer } from "@/hooks/useWholesaleCustomer";

interface OrderRow {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  total: number;
  units_total: number;
  items_count: number;
  overall_progress_percentage: number;
  estimated_delivery_at: string | null;
  current_stage: { code: string; name: string; percentage: number } | null;
  created_at: string;
  requested_delivery_date: string | null;
}

const orderStatusLabel: Record<string, string> = {
  pending: "Aguardando análise",
  paid: "Pago",
  processing: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Estornado",
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const WholesaleOrders = () => {
  const { wholesaleCustomer } = useWholesaleCustomer();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wholesaleCustomer) return;
    setLoading(true);
    supabase
      .from("wholesale_orders_summary")
      .select("*")
      .eq("wholesale_customer_id", wholesaleCustomer.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as unknown as OrderRow[]) || []);
        setLoading(false);
      });
  }, [wholesaleCustomer]);

  return (
    <WholesalePortalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Meus Pedidos
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Acompanhe o progresso da produção e a previsão de entrega.
          </p>
        </div>
        <Link
          to="/atacado/catalogo"
          className="hidden sm:inline-flex items-center gap-1 text-sm text-primary font-body hover:underline"
        >
          + Novo pedido
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground font-body mb-4">Você ainda não tem pedidos.</p>
          <Link
            to="/atacado/catalogo"
            className="inline-flex items-center gap-1 text-sm text-primary font-body hover:underline"
          >
            Fazer o primeiro pedido →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/atacado/pedidos/${o.id}`}
              className="block bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    Pedido #{o.order_number} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="font-body text-foreground">
                    {o.items_count} itens · {o.units_total} unidades · {formatBRL(Number(o.total))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-body bg-muted text-foreground rounded-full px-2 py-0.5">
                    {orderStatusLabel[o.status] ?? o.status}
                  </span>
                  {o.estimated_delivery_at && (
                    <div className="text-xs text-muted-foreground font-body mt-1">
                      Previsão de entrega:{" "}
                      <strong>{new Date(o.estimated_delivery_at).toLocaleDateString("pt-BR")}</strong>
                    </div>
                  )}
                  {o.requested_delivery_date && (
                    <div className="text-xs text-muted-foreground font-body">
                      Solicitado para: {new Date(o.requested_delivery_date).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={Number(o.overall_progress_percentage || 0)} className="h-2" />
                </div>
                <div className="text-sm font-display font-bold text-primary w-12 text-right">
                  {Math.round(Number(o.overall_progress_percentage || 0))}%
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              {o.current_stage && (
                <div className="text-xs text-muted-foreground font-body mt-2">
                  Etapa atual: <strong>{o.current_stage.name}</strong>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </WholesalePortalLayout>
  );
};

export default WholesaleOrders;
