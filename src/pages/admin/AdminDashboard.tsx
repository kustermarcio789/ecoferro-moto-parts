import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Users, DollarSign, AlertTriangle, MessageSquare, TrendingUp, ShoppingCart } from "lucide-react";

interface KPI {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

const AdminDashboard = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      const [products, orders, customers, leads, lowStock, carts] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id, total, status", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).lte("stock", 5),
        supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("recovered", false),
      ]);

      const orderData = orders.data || [];
      const totalRevenue = orderData.filter(o => o.status === 'paid' || o.status === 'delivered').reduce((s, o) => s + Number(o.total), 0);
      const pendingOrders = orderData.filter(o => o.status === 'pending').length;

      setKpis([
        { label: "Produtos Ativos", value: products.count || 0, icon: Package, color: "text-primary" },
        { label: "Pedidos Total", value: orders.count || 0, icon: ShoppingBag, color: "text-blue-500" },
        { label: "Pedidos Pendentes", value: pendingOrders, icon: ShoppingCart, color: "text-amber-500" },
        { label: "Faturamento", value: `R$ ${totalRevenue.toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "text-primary" },
        { label: "Clientes", value: customers.count || 0, icon: Users, color: "text-indigo-500" },
        { label: "Leads", value: leads.count || 0, icon: MessageSquare, color: "text-cyan-500" },
        { label: "Estoque Baixo", value: lowStock.count || 0, icon: AlertTriangle, color: "text-destructive" },
        { label: "Carrinhos Abandonados", value: carts.count || 0, icon: TrendingUp, color: "text-amber-500" },
      ]);
      setLoading(false);
    };
    fetchKPIs();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map(kpi => (
              <div key={kpi.label} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-4">Início Rápido</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Cadastrar Produto", desc: "Adicione um novo produto ao catálogo", href: "/admin/produtos" },
                { label: "Ver Pedidos", desc: "Gerencie pedidos pendentes", href: "/admin/pedidos" },
                { label: "Gerenciar Leads", desc: "Veja contatos e orçamentos", href: "/admin/leads" },
              ].map(action => (
                <a key={action.label} href={action.href} className="block p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all">
                  <p className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">{action.label}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">{action.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
