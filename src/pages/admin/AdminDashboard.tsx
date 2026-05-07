import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ShoppingBag, Users, DollarSign, AlertTriangle,
  MessageSquare, TrendingUp, ShoppingCart, Target, BarChart3,
  Truck, ArrowUpRight, Link2,
} from "lucide-react";
import { formatCurrency } from "@/lib/tracking";
import { PRODUCTION_SOURCE_SYSTEM } from "@/services/inventoryService";

interface KPI {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

const supabaseAny = supabase as any;

const AdminDashboard = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [products, orders, customers, leads, lowStock, carts, quotes, failedIntegrations] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id, total, status, created_at, sales_channel"),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).lte("stock", 5),
        supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("recovered", false),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabaseAny.from("integration_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);

      const orderData = orders.data || [];
      const paidOrders = orderData.filter((order: any) =>
        ["paid", "delivered", "shipped"].includes(order.status),
      );

      const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
      const todayRevenue = paidOrders
        .filter((order: any) => order.created_at >= today)
        .reduce((sum: number, order: any) => sum + Number(order.total), 0);
      const weekRevenue = paidOrders
        .filter((order: any) => order.created_at >= weekAgo)
        .reduce((sum: number, order: any) => sum + Number(order.total), 0);
      const monthRevenue = paidOrders
        .filter((order: any) => order.created_at >= monthStart)
        .reduce((sum: number, order: any) => sum + Number(order.total), 0);
      const pendingOrders = orderData.filter((order: any) => order.status === "pending").length;
      const averageTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      setKpis([
        { label: "Vendas Hoje", value: formatCurrency(todayRevenue), icon: DollarSign, color: "text-primary" },
        { label: "Vendas Semana", value: formatCurrency(weekRevenue), icon: TrendingUp, color: "text-blue-500" },
        { label: "Vendas Mes", value: formatCurrency(monthRevenue), icon: BarChart3, color: "text-indigo-500" },
        { label: "Ticket Medio", value: formatCurrency(averageTicket), icon: Target, color: "text-cyan-500" },
        { label: "Pedidos Pendentes", value: pendingOrders, icon: ShoppingCart, color: "text-amber-500" },
        { label: "Pedidos Pagos", value: paidOrders.length, icon: ShoppingBag, color: "text-primary" },
        { label: "Faturamento Total", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-primary" },
        { label: "Produtos Ativos", value: products.count || 0, icon: Package, color: "text-primary" },
        { label: "Clientes", value: customers.count || 0, icon: Users, color: "text-indigo-500" },
        { label: "Leads", value: leads.count || 0, icon: MessageSquare, color: "text-cyan-500" },
        { label: "Estoque Baixo", value: lowStock.count || 0, icon: AlertTriangle, color: "text-destructive" },
        { label: "Integracoes Falhas", value: failedIntegrations.count || 0, icon: Link2, color: "text-amber-600" },
        { label: "Carrinhos Abandonados", value: carts.count || 0, icon: ShoppingCart, color: "text-amber-500" },
        { label: "Orcamentos Novos", value: quotes.count || 0, icon: Truck, color: "text-blue-500" },
      ]);

      setLoading(false);
    };

    fetchKPIs();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-eco">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-foreground">
                Inicio rapido
              </h2>
              <div className="grid gap-3">
                {[
                  { label: "Cadastrar Produto", desc: "Adicione um novo produto ao catalogo", href: "/admin/produtos" },
                  { label: "Ver Pedidos", desc: "Gerencie pedidos pendentes e cancelamentos", href: "/admin/pedidos" },
                  { label: "Controle de Estoque", desc: "Monitore saldos disponiveis e reservas", href: "/admin/estoque" },
                  { label: "Movimentacoes", desc: "Audite entradas, saidas e ajustes", href: "/admin/movimentacoes" },
                  { label: "Integracoes", desc: "Acompanhe producao, ML e erros de sincronizacao", href: "/admin/integracoes" },
                  { label: "Relatorios", desc: "Veja DRE, margens e canais de venda", href: "/admin/relatorios" },
                ].map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{action.label}</p>
                      <p className="mt-0.5 text-xs font-body text-muted-foreground">{action.desc}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-wider text-foreground">
                Canais de Venda
              </h2>
              <div className="space-y-4">
                {[
                  { key: "website", label: "Website", hint: "Baixa estoque quando o pedido e processado" },
                  { key: "atacado", label: "Atacado", hint: "Canal pronto para saida manual ou pedidos B2B" },
                  { key: "mercado_livre", label: "Mercado Livre", hint: "Preparado para importacao de pedidos e deduplicacao" },
                  { key: "barracao", label: "Barracao / loja", hint: "Saida local auditada no painel" },
                ].map((channel) => (
                  <div key={channel.key} className="rounded-lg bg-muted/50 p-3">
                    <div className="font-display text-sm uppercase tracking-wider text-foreground">{channel.label}</div>
                    <div className="mt-1 text-xs font-body text-muted-foreground">{channel.hint}</div>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-border p-3 text-xs font-body text-muted-foreground">
                  Origem de producao monitorada: {PRODUCTION_SOURCE_SYSTEM}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
