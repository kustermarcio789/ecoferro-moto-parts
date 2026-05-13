import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle2, Clock, Loader2, Package, Truck, Printer } from "lucide-react";
import WholesalePortalLayout from "@/components/wholesale/WholesalePortalLayout";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaleCustomer } from "@/hooks/useWholesaleCustomer";
import OrderItemsTableWithImages from "@/components/OrderItemWithImage";
import OrderPrintView from "@/components/admin/OrderPrintView";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  confirmed_quantity: number | null;
  delivered_quantity: number;
}

interface StageProgress {
  id: string;
  stage_id: string;
  percentage: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  expected_start_at: string | null;
  expected_completion_at: string | null;
  notes: string | null;
  stage: {
    code: string;
    name: string;
    description: string | null;
    sort_order: number;
    color: string | null;
    weight_percentage: number;
  };
}

interface OrderDetail {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  total: number;
  subtotal: number;
  created_at: string;
  requested_delivery_date: string | null;
  production_started_at: string | null;
  estimated_delivery_at: string | null;
  overall_progress_percentage: number;
  atacadista_notes: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  shipping_carrier: string | null;
  tracking_code: string | null;
  invoice_number: string | null;
  items: OrderItem[];
  progress: StageProgress[];
}

const formatBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const stageStatusBadge: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  pending: { label: "Aguardando", cls: "bg-muted text-muted-foreground", Icon: Clock },
  in_progress: { label: "Em andamento", cls: "bg-amber-100 text-amber-800", Icon: Loader2 },
  paused: { label: "Pausado", cls: "bg-orange-100 text-orange-800", Icon: Clock },
  completed: { label: "Concluído", cls: "bg-green-100 text-green-800", Icon: CheckCircle2 },
  skipped: { label: "Pulado", cls: "bg-muted text-muted-foreground", Icon: Clock },
};

const WholesaleOrderDetail = () => {
  const { id } = useParams();
  const { wholesaleCustomer } = useWholesaleCustomer();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    if (!id || !wholesaleCustomer) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("orders")
        .select(
          `id, order_number, status, payment_status, total, subtotal, created_at,
           requested_delivery_date, production_started_at, estimated_delivery_at,
           overall_progress_percentage, atacadista_notes, internal_notes, customer_notes,
           shipping_carrier, tracking_code, invoice_number, wholesale_customer_id`,
        )
        .eq("id", id)
        .eq("wholesale_customer_id", wholesaleCustomer.id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("id, product_name, sku, quantity, unit_price, total, confirmed_quantity, delivered_quantity, product:product_id(product_images(url, is_primary))")
        .eq("order_id", id)
        .order("created_at"),
      supabase
        .from("order_production_progress")
        .select(
          `id, stage_id, percentage, status, started_at, completed_at,
           expected_start_at, expected_completion_at, notes,
           stage:stage_id(code, name, description, sort_order, color, weight_percentage)`,
        )
        .eq("order_id", id)
        .order("stage(sort_order)"),
    ]).then(([o, items, progress]) => {
      if (!o.data) {
        setOrder(null);
        setLoading(false);
        return;
      }
      setOrder({
        ...(o.data as any),
        items: items.data ?? [],
        progress: (progress.data as any) ?? [],
      });
      setLoading(false);
    });
  }, [id, wholesaleCustomer]);

  if (loading) {
    return (
      <WholesalePortalLayout>
        <div className="space-y-3">
          <div className="h-12 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </WholesalePortalLayout>
    );
  }
  if (!order) {
    return (
      <WholesalePortalLayout>
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-muted-foreground font-body mb-3">Pedido não encontrado.</p>
          <Link to="/atacado/pedidos" className="text-primary text-sm font-body hover:underline">
            ← Voltar para a lista
          </Link>
        </div>
      </WholesalePortalLayout>
    );
  }

  const overall = Math.round(Number(order.overall_progress_percentage || 0));

  return (
    <WholesalePortalLayout>
      <div className="print:hidden">
      <div className="flex items-center justify-between mb-4">
        <Link to="/atacado/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para meus pedidos
        </Link>
        <Button variant="outline" size="sm" onClick={() => setShowPrintView(true)}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir Pedido
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
              Pedido #{order.order_number}
            </div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground">
              Acompanhamento da Produção
            </h1>
            <div className="text-sm text-muted-foreground font-body mt-1">
              Realizado em {new Date(order.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">Progresso geral</div>
            <div className="text-3xl lg:text-4xl font-display font-bold text-primary">{overall}%</div>
          </div>
        </div>
        <Progress value={overall} className="h-3 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InfoTile
            icon={Calendar}
            label="Solicitado para"
            value={
              order.requested_delivery_date
                ? new Date(order.requested_delivery_date).toLocaleDateString("pt-BR")
                : "Sem prazo definido"
            }
          />
          <InfoTile
            icon={Clock}
            label="Início da produção"
            value={
              order.production_started_at
                ? new Date(order.production_started_at).toLocaleDateString("pt-BR")
                : "Aguardando"
            }
          />
          <InfoTile
            icon={Truck}
            label="Previsão de entrega"
            value={
              order.estimated_delivery_at
                ? new Date(order.estimated_delivery_at).toLocaleDateString("pt-BR")
                : "Em planejamento"
            }
            highlight
          />
        </div>
      </div>

      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-display uppercase tracking-wider font-bold text-foreground mb-4">Etapas da Produção</h2>
        {order.progress.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body py-6 text-center">
            Etapas serão criadas quando a produção for iniciada.
          </p>
        ) : (
          <ol className="space-y-4">
            {order.progress.map((p, idx) => {
              const badge = stageStatusBadge[p.status] ?? stageStatusBadge.pending;
              return (
                <li key={p.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-display font-bold ${
                        p.status === "completed"
                          ? "bg-primary text-primary-foreground"
                          : p.status === "in_progress"
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                      style={p.stage.color && p.status === "in_progress" ? { backgroundColor: p.stage.color } : {}}
                    >
                      {idx + 1}
                    </div>
                    {idx < order.progress.length - 1 && <div className="flex-1 w-0.5 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                      <h3 className="font-body font-medium text-foreground">{p.stage.name}</h3>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-body px-2 py-0.5 rounded-full ${badge.cls}`}>
                        <badge.Icon
                          className={`h-3 w-3 ${p.status === "in_progress" ? "animate-spin-slow" : ""}`}
                        />
                        {badge.label}
                      </span>
                    </div>
                    {p.stage.description && (
                      <p className="text-xs text-muted-foreground font-body mb-2">{p.stage.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <Progress value={Number(p.percentage)} className="flex-1 h-2" />
                      <span className="text-xs font-display font-bold text-foreground/70 w-10 text-right">
                        {Math.round(Number(p.percentage || 0))}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground font-body">
                      <div>
                        Início:{" "}
                        {p.started_at
                          ? new Date(p.started_at).toLocaleDateString("pt-BR")
                          : p.expected_start_at
                          ? `prev. ${new Date(p.expected_start_at).toLocaleDateString("pt-BR")}`
                          : "—"}
                      </div>
                      <div className="text-right">
                        Conclusão:{" "}
                        {p.completed_at
                          ? new Date(p.completed_at).toLocaleDateString("pt-BR")
                          : p.expected_completion_at
                          ? `prev. ${new Date(p.expected_completion_at).toLocaleDateString("pt-BR")}`
                          : "—"}
                      </div>
                    </div>
                    {p.notes && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 font-body">
                        {p.notes}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-display uppercase tracking-wider font-bold text-foreground mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Itens do Pedido
        </h2>
        <OrderItemsTableWithImages 
          items={order.items as any[]} 
          isAdmin={false} 
        />
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex justify-end gap-8 mb-2">
            <span className="text-right font-display uppercase text-xs">Subtotal</span>
            <span className="text-right font-body w-32">{formatBRL(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-end gap-8">
            <span className="text-right font-display uppercase text-xs font-bold">Total</span>
            <span className="text-right font-display font-bold text-primary w-32">{formatBRL(Number(order.total))}</span>
          </div>
        </div>
      </section>

      {(order.atacadista_notes || order.internal_notes || order.tracking_code) && (
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-display uppercase tracking-wider font-bold text-foreground mb-3">Informações</h2>
          {order.atacadista_notes && (
            <div className="mb-3">
              <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">Suas observações</div>
              <p className="text-sm font-body text-foreground">{order.atacadista_notes}</p>
            </div>
          )}
          {order.internal_notes && (
            <div className="mb-3">
              <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                Mensagem do time
              </div>
              <p className="text-sm font-body text-foreground whitespace-pre-line">{order.internal_notes}</p>
            </div>
          )}
          {order.tracking_code && (
            <div>
              <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">Rastreio</div>
              <p className="text-sm font-body text-foreground">
                {order.shipping_carrier && <span>{order.shipping_carrier} · </span>}
                <strong>{order.tracking_code}</strong>
              </p>
            </div>
          )}
        </section>
      )}
      </div>

      {showPrintView && (
        <OrderPrintView 
          order={order} 
          items={order.items as any[]} 
          onClose={() => setShowPrintView(false)} 
        />
      )}
    </WholesalePortalLayout>
  );
};

const InfoTile = ({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className={`rounded-xl p-3 border ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"}`}>
    <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-muted-foreground mb-1">
      <Icon className={`h-3.5 w-3.5 ${highlight ? "text-primary" : ""}`} /> {label}
    </div>
    <div className={`font-body text-sm ${highlight ? "text-primary font-bold" : "text-foreground"}`}>{value}</div>
  </div>
);

export default WholesaleOrderDetail;
