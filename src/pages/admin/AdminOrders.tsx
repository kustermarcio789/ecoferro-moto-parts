import { useEffect, useState } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, Truck, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/tracking";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-primary/10 text-primary" },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Entregue", color: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
  refunded: { label: "Reembolsado", color: "bg-muted text-muted-foreground" },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("orders").select("*, customers(name, email)").order("created_at", { ascending: false }).limit(50);
      if (statusFilter) query = query.eq("status", statusFilter as any);
      const { data } = await query;
      setOrders(data || []);
      setLoading(false);
    };
    fetch();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    if (status === "shipped") updates.shipped_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("orders").update(updates).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  return (
    <AdminLayout title="Pedidos">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs font-body"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">#</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Cliente</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Total</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Pagamento</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Data</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-4"><div className="h-12 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground font-body">Nenhum pedido encontrado</td></tr>
              ) : orders.map(o => {
                const st = statusLabels[o.status] || { label: o.status, color: "bg-muted text-muted-foreground" };
                return (
                  <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-display font-bold text-foreground">#{o.order_number}</td>
                    <td className="p-4 font-body text-foreground">{o.customers?.name || "—"}<br /><span className="text-xs text-muted-foreground">{o.customers?.email}</span></td>
                    <td className="p-4 text-right font-body font-medium">{formatCurrency(Number(o.total))}</td>
                    <td className="p-4 text-center">
                      <Select value={o.status} onValueChange={v => updateStatus(o.id, v)}>
                        <SelectTrigger className={`w-32 text-xs font-body ${st.color} border-0`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-center text-xs font-body text-muted-foreground">{o.payment_method || "—"}</td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
