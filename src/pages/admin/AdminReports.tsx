import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/tracking";
import { DollarSign, TrendingDown, TrendingUp, Percent, Package, Truck } from "lucide-react";
import { formatSalesChannel } from "@/services/inventoryService";

const supabaseAny = supabase as any;

const AdminReports = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [orders, products, movements] = await Promise.all([
        supabase.from("orders").select("total, subtotal, discount, shipping_cost, status, sales_channel, created_at"),
        supabase.from("products").select("name, price, cost"),
        supabaseAny.from("inventory_movements").select("type, quantity, created_at, channel"),
      ]);

      const allOrders = orders.data || [];
      const paidOrders = allOrders.filter((order: any) => ["paid", "delivered", "shipped"].includes(order.status));
      const allProducts = products.data || [];
      const allMovements = movements.data || [];

      const grossRevenue = paidOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
      const discounts = paidOrders.reduce((sum: number, order: any) => sum + Number(order.discount || 0), 0);
      const shipping = paidOrders.reduce((sum: number, order: any) => sum + Number(order.shipping_cost || 0), 0);
      const subtotal = paidOrders.reduce((sum: number, order: any) => sum + Number(order.subtotal || 0), 0);

      const averageMargin = allProducts.filter((product: any) => product.cost > 0).reduce((sum: number, product: any, _, array: any[]) => {
        const margin = ((Number(product.price) - Number(product.cost)) / Number(product.price || 1)) * 100;
        return sum + margin / Math.max(array.length, 1);
      }, 0);

      const estimatedCosts = subtotal * (1 - averageMargin / 100);
      const taxes = grossRevenue * 0.06;
      const grossProfit = grossRevenue - estimatedCosts - shipping;
      const netProfit = grossProfit - discounts - taxes;

      const channelSummary = Object.entries(
        paidOrders.reduce((acc: Record<string, number>, order: any) => {
          const channel = order.sales_channel || "website";
          acc[channel] = (acc[channel] || 0) + Number(order.total);
          return acc;
        }, {}),
      ).map(([channel, total]) => ({ channel, total })).sort((a, b) => Number(b.total) - Number(a.total));

      const movementSummary = {
        entries: allMovements.filter((movement: any) => ["entry", "entry_from_production", "return", "cancellation_reversal"].includes(movement.type)).reduce((sum: number, movement: any) => sum + Number(movement.quantity || 0), 0),
        exits: allMovements.filter((movement: any) => ["sale", "exit", "damaged_loss"].includes(movement.type)).reduce((sum: number, movement: any) => sum + Number(movement.quantity || 0), 0),
        reservations: allMovements.filter((movement: any) => ["reservation", "release_reservation"].includes(movement.type)).length,
      };

      setData({
        grossRevenue,
        discounts,
        shipping,
        taxes,
        estimatedCosts,
        grossProfit,
        netProfit,
        averageMargin,
        totalOrders: paidOrders.length,
        averageTicket: paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0,
        channelSummary,
        movementSummary,
      });
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Relatorios">
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Relatorios">
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-6 font-display text-lg font-bold uppercase tracking-wider text-foreground">DRE simplificada</h2>
        <div className="space-y-3">
          {[
            { label: "Faturamento bruto", value: data.grossRevenue, icon: DollarSign, positive: true },
            { label: "(-) Descontos", value: data.discounts, icon: TrendingDown, positive: false },
            { label: "(-) Impostos estimados (6%)", value: data.taxes, icon: Percent, positive: false },
            { label: "(-) Fretes", value: data.shipping, icon: Truck, positive: false },
            { label: "(-) Custo estimado", value: data.estimatedCosts, icon: Package, positive: false },
            { label: "= Lucro bruto", value: data.grossProfit, icon: TrendingUp, positive: data.grossProfit > 0 },
            { label: "= Lucro liquido", value: data.netProfit, icon: TrendingUp, positive: data.netProfit > 0 },
          ].map((row) => (
            <div key={row.label} className={`flex items-center justify-between rounded-lg p-3 ${row.label.startsWith("=") ? "bg-muted/50 font-bold" : ""}`}>
              <div className="flex items-center gap-3">
                <row.icon className={`h-4 w-4 ${row.positive ? "text-primary" : "text-destructive"}`} />
                <span className="text-sm font-body text-foreground">{row.label}</span>
              </div>
              <span className={`font-display text-lg ${row.positive ? "text-primary" : "text-destructive"}`}>{formatCurrency(Math.abs(row.value))}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5"><span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Pedidos pagos</span><p className="mt-1 font-display text-2xl font-bold text-foreground">{data.totalOrders}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Ticket medio</span><p className="mt-1 font-display text-2xl font-bold text-foreground">{formatCurrency(data.averageTicket)}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Margem media</span><p className="mt-1 font-display text-2xl font-bold text-primary">{data.averageMargin.toFixed(1)}%</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-foreground">Saida por canal</h3>
          <div className="space-y-3">
            {data.channelSummary.map((channel: any) => (
              <div key={channel.channel} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm font-body text-foreground">{formatSalesChannel(channel.channel)}</span>
                <span className="font-display font-bold text-primary">{formatCurrency(Number(channel.total))}</span>
              </div>
            ))}
            {data.channelSummary.length === 0 && <p className="text-xs font-body text-muted-foreground">Nenhum pedido pago ainda.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-foreground">Resumo de movimentacoes</h3>
          <div className="grid gap-3">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-xs font-body uppercase tracking-wider text-muted-foreground">Entradas</div>
              <div className="mt-1 font-display text-2xl font-bold text-primary">{data.movementSummary.entries}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-xs font-body uppercase tracking-wider text-muted-foreground">Saidas</div>
              <div className="mt-1 font-display text-2xl font-bold text-destructive">{data.movementSummary.exits}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-xs font-body uppercase tracking-wider text-muted-foreground">Eventos de reserva</div>
              <div className="mt-1 font-display text-2xl font-bold text-blue-700">{data.movementSummary.reservations}</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
