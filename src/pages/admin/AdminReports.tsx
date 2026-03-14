import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/tracking";
import { DollarSign, TrendingDown, TrendingUp, Percent, Package, Truck } from "lucide-react";

const AdminReports = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [orders, products] = await Promise.all([
        supabase.from("orders").select("total, subtotal, discount, shipping_cost, status, sales_channel, created_at"),
        supabase.from("products").select("name, price, cost, stock"),
      ]);

      const allOrders = orders.data || [];
      const paidOrders = allOrders.filter(o => ["paid", "delivered", "shipped"].includes(o.status));
      const allProducts = products.data || [];

      const faturamentoBruto = paidOrders.reduce((s, o) => s + Number(o.total), 0);
      const totalDescontos = paidOrders.reduce((s, o) => s + Number(o.discount || 0), 0);
      const totalFrete = paidOrders.reduce((s, o) => s + Number(o.shipping_cost || 0), 0);
      const totalSubtotal = paidOrders.reduce((s, o) => s + Number(o.subtotal), 0);

      // Margin estimation from products
      const productMargins = allProducts
        .filter(p => p.cost && p.cost > 0)
        .map(p => ({
          name: p.name,
          price: Number(p.price),
          cost: Number(p.cost),
          margin: ((Number(p.price) - Number(p.cost)) / Number(p.price)) * 100,
          profit: Number(p.price) - Number(p.cost),
        }))
        .sort((a, b) => b.margin - a.margin);

      const avgMargin = productMargins.length > 0
        ? productMargins.reduce((s, p) => s + p.margin, 0) / productMargins.length
        : 0;

      const estimatedCosts = totalSubtotal * (1 - avgMargin / 100);
      const impostos = faturamentoBruto * 0.06; // Simples estimado
      const lucroBruto = faturamentoBruto - estimatedCosts - totalFrete;
      const lucroLiquido = lucroBruto - totalDescontos - impostos;

      setData({
        faturamentoBruto, totalDescontos, totalFrete, impostos,
        estimatedCosts, lucroBruto, lucroLiquido, avgMargin,
        totalOrders: paidOrders.length,
        ticketMedio: paidOrders.length > 0 ? faturamentoBruto / paidOrders.length : 0,
        productMargins: productMargins.slice(0, 10),
        productMarginsBottom: [...productMargins].sort((a, b) => a.margin - b.margin).slice(0, 10),
      });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Relatórios">
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Relatórios">
      {/* DRE */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-6">DRE Simplificada</h2>
        <div className="space-y-3">
          {[
            { label: "Faturamento Bruto", value: data.faturamentoBruto, icon: DollarSign, positive: true },
            { label: "(-) Descontos", value: data.totalDescontos, icon: TrendingDown, positive: false },
            { label: "(-) Impostos Estimados (6%)", value: data.impostos, icon: Percent, positive: false },
            { label: "(-) Fretes", value: data.totalFrete, icon: Truck, positive: false },
            { label: "(-) Custo dos Produtos", value: data.estimatedCosts, icon: Package, positive: false },
            { label: "= Lucro Bruto", value: data.lucroBruto, icon: TrendingUp, positive: data.lucroBruto > 0 },
            { label: "= Lucro Líquido", value: data.lucroLiquido, icon: TrendingUp, positive: data.lucroLiquido > 0 },
          ].map(row => (
            <div key={row.label} className={`flex items-center justify-between p-3 rounded-lg ${row.label.startsWith("=") ? "bg-muted/50 font-bold" : ""}`}>
              <div className="flex items-center gap-3">
                <row.icon className={`h-4 w-4 ${row.positive ? "text-primary" : "text-destructive"}`} />
                <span className="font-body text-sm text-foreground">{row.label}</span>
              </div>
              <span className={`font-display text-lg ${row.positive ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(Math.abs(row.value))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">Pedidos Pagos</span>
          <p className="font-display text-2xl font-bold text-foreground mt-1">{data.totalOrders}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">Ticket Médio</span>
          <p className="font-display text-2xl font-bold text-foreground mt-1">{formatCurrency(data.ticketMedio)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">Margem Média</span>
          <p className="font-display text-2xl font-bold text-primary mt-1">{data.avgMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Margin Rankings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-4">🔝 Maior Margem</h3>
          <div className="space-y-2">
            {data.productMargins.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-body text-foreground truncate max-w-[200px]">{p.name}</span>
                <span className="font-display font-bold text-primary">{p.margin.toFixed(1)}%</span>
              </div>
            ))}
            {data.productMargins.length === 0 && <p className="text-xs text-muted-foreground font-body">Cadastre custos nos produtos para ver margens</p>}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-4">⚠️ Menor Margem</h3>
          <div className="space-y-2">
            {data.productMarginsBottom.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-body text-foreground truncate max-w-[200px]">{p.name}</span>
                <span className={`font-display font-bold ${p.margin < 10 ? "text-destructive" : "text-amber-500"}`}>{p.margin.toFixed(1)}%</span>
              </div>
            ))}
            {data.productMarginsBottom.length === 0 && <p className="text-xs text-muted-foreground font-body">Cadastre custos nos produtos para ver margens</p>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
