import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ShoppingBag, Users, DollarSign, AlertTriangle,
  MessageSquare, TrendingUp, ShoppingCart, Target, BarChart3,
  Truck, Percent, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { formatCurrency } from "@/lib/tracking";

interface KPI {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: string;
}

const AdminDashboard = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [products, orders, customers, leads, lowStock, carts, quotes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id, total, status, subtotal, shipping_cost, discount, created_at, sales_channel"),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).lte("stock", 5),
        supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("recovered", false),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);

      const orderData = orders.data || [];
      const paidOrders = orderData.filter(o => o.status === 'paid' || o.status === 'delivered' || o.status === 'shipped');
      const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
      const todayRevenue = paidOrders.filter(o => o.created_at >= today).reduce((s, o) => s + Number(o.total), 0);
      const weekRevenue = paidOrders.filter(o => o.created_at >= weekAgo).reduce((s, o) => s + Number(o.total), 0);
      const monthRevenue = paidOrders.filter(o => o.created_at >= monthStart).reduce((s, o) => s + Number(o.total), 0);
      const pendingOrders = orderData.filter(o => o.status === 'pending').length;
      const ticketMedio = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      setKpis([
        { label: "Vendas Hoje", value: formatCurrency(todayRevenue), icon: DollarSign, color: "text-primary" },
        { label: "Vendas Semana", value: formatCurrency(weekRevenue), icon: TrendingUp, color: "text-blue-500" },
        { label: "Vendas Mês", value: formatCurrency(monthRevenue), icon: BarChart3, color: "text-indigo-500" },
        { label: "Ticket Médio", value: formatCurrency(ticketMedio), icon: Target, color: "text-cyan-500" },
        { label: "Pedidos Pendentes", value: pendingOrders, icon: ShoppingCart, color: "text-amber-500" },
        { label: "Pedidos Pagos", value: paidOrders.length, icon: ShoppingBag, color: "text-primary" },
        { label: "Faturamento Total", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-primary" },
        { label: "Produtos Ativos", value: products.count || 0, icon: Package, color: "text-primary" },
        { label: "Clientes", value: customers.count || 0, icon: Users, color: "text-indigo-500" },
        { label: "Leads", value: leads.count || 0, icon: MessageSquare, color: "text-cyan-500" },
        { label: "Estoque Baixo", value: lowStock.count || 0, icon: AlertTriangle, color: "text-destructive" },
        { label: "Carrinhos Abandonados", value: carts.count || 0, icon: ShoppingCart, color: "text-amber-500" },
        { label: "Orçamentos Novos", value: quotes.count || 0, icon: Truck, color: "text-blue-500" },
      ]);
      setLoading(false);
    };
    fetchKPIs();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map(kpi => (
              <div key={kpi.label} className="bg-card rounded-xl border border-border p-5 hover:shadow-eco transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-4">Início Rápido</h2>
              <div className="grid gap-3">
                {[
                  { label: "Cadastrar Produto", desc: "Adicione um novo produto ao catálogo", href: "/admin/produtos" },
                  { label: "Ver Pedidos", desc: "Gerencie pedidos pendentes", href: "/admin/pedidos" },
                  { label: "Gerenciar Leads", desc: "Veja contatos e orçamentos", href: "/admin/leads" },
                  { label: "Controle de Estoque", desc: "Monitore estoque e rupturas", href: "/admin/estoque" },
                  { label: "Parceiros & Afiliados", desc: "Gerencie programa de parceiros", href: "/admin/parceiros" },
                  { label: "Relatórios", desc: "DRE, margens e performance", href: "/admin/relatorios" },
                ].map(action => (
                  <a key={action.label} href={action.href} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all">
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">{action.label}</p>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{action.desc}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-4">Canais de Venda</h2>
              <div className="space-y-4">
                {["retail", "wholesale", "affiliate", "partner"].map(channel => {
                  const labels: Record<string, string> = { retail: "Varejo", wholesale: "Atacado", affiliate: "Afiliados", partner: "Parceiros" };
                  return (
                    <div key={channel} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-display text-sm uppercase tracking-wider text-foreground">{labels[channel]}</span>
                      <span className="text-xs text-muted-foreground font-body">Em breve</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
