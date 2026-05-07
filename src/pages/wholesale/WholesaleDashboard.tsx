import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ClipboardList, Package, ShoppingBag, TrendingUp } from "lucide-react";
import WholesalePortalLayout from "@/components/wholesale/WholesalePortalLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleCustomer } from "@/hooks/useWholesaleCustomer";

interface OrderSummary {
  id: string;
  order_number: number;
  status: string;
  total: number;
  units_total: number;
  items_count: number;
  overall_progress_percentage: number;
  estimated_delivery_at: string | null;
  current_stage: { code: string; name: string; percentage: number } | null;
  created_at: string;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const WholesaleDashboard = () => {
  const { user } = useAuth();
  const { wholesaleCustomer } = useWholesaleCustomer();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !wholesaleCustomer) return;
    setLoading(true);
    supabase
      .from("wholesale_orders_summary")
      .select("*")
      .eq("wholesale_customer_id", wholesaleCustomer.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setOrders((data as unknown as OrderSummary[]) || []);
        setLoading(false);
      });
  }, [user, wholesaleCustomer]);

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const inProduction = orders.filter((o) => o.overall_progress_percentage > 0 && o.overall_progress_percentage < 100).length;

  return (
    <WholesalePortalLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold uppercase tracking-wider text-foreground">
          Olá, {wholesaleCustomer?.contact_name?.split(" ")[0] || "atacadista"}
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          Acompanhe a produção dos seus pedidos e faça novas solicitações.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={ClipboardList} label="Pedidos recentes" value={String(totalOrders)} />
        <KpiCard icon={Activity} label="Em produção" value={String(inProduction)} />
        <KpiCard icon={Package} label="Investido (recentes)" value={formatBRL(totalSpent)} />
        <KpiCard
          icon={TrendingUp}
          label="Tipo"
          value={(wholesaleCustomer?.customer_type || "wholesale").replace(/^./, (c) => c.toUpperCase())}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Link
          to="/atacado/catalogo"
          className="group bg-primary text-primary-foreground rounded-2xl p-6 hover:opacity-90 transition-opacity"
        >
          <ShoppingBag className="h-8 w-8 mb-3 opacity-90" />
          <h3 className="font-display uppercase tracking-wider font-bold mb-1">Solicitar novo pedido</h3>
          <p className="text-sm opacity-80 font-body">Catálogo com seus preços e prazos personalizados.</p>
        </Link>
        <Link
          to="/atacado/pedidos"
          className="bg-card border border-border rounded-2xl p-6 hover:border-primary transition-colors"
        >
          <ClipboardList className="h-8 w-8 mb-3 text-primary" />
          <h3 className="font-display uppercase tracking-wider font-bold mb-1 text-foreground">Meus pedidos</h3>
          <p className="text-sm text-muted-foreground font-body">Acompanhar progresso e datas de entrega.</p>
        </Link>
        <a
          href="https://wa.me/551420340647"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-card border border-border rounded-2xl p-6 hover:border-primary transition-colors"
        >
          <Activity className="h-8 w-8 mb-3 text-primary" />
          <h3 className="font-display uppercase tracking-wider font-bold mb-1 text-foreground">Suporte comercial</h3>
          <p className="text-sm text-muted-foreground font-body">Falar com seu consultor pelo WhatsApp.</p>
        </a>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display uppercase tracking-wider font-bold text-foreground">Pedidos recentes</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/atacado/pedidos">Ver todos</Link>
          </Button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body py-8 text-center">
            Você ainda não tem pedidos. <Link to="/atacado/catalogo" className="text-primary hover:underline">Fazer o primeiro pedido</Link>.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link
                to={`/atacado/pedidos/${o.id}`}
                key={o.id}
                className="block p-4 rounded-xl border border-border hover:border-primary transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                      Pedido #{o.order_number}
                    </div>
                    <div className="text-sm font-body text-foreground">
                      {o.items_count} itens · {o.units_total} un · {formatBRL(Number(o.total || 0))}
                    </div>
                  </div>
                  <div className="text-right text-xs font-body text-muted-foreground">
                    {o.estimated_delivery_at
                      ? `Previsão: ${new Date(o.estimated_delivery_at).toLocaleDateString("pt-BR")}`
                      : "Aguardando produção"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={Number(o.overall_progress_percentage || 0)} className="h-2" />
                  </div>
                  <div className="text-xs font-display font-bold text-primary w-12 text-right">
                    {Math.round(Number(o.overall_progress_percentage || 0))}%
                  </div>
                </div>
                {o.current_stage && (
                  <div className="text-xs text-muted-foreground font-body mt-1">
                    Etapa atual: {o.current_stage.name}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </WholesalePortalLayout>
  );
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="bg-card border border-border rounded-2xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="text-xl lg:text-2xl font-display font-bold text-foreground">{value}</div>
  </div>
);

export default WholesaleDashboard;
