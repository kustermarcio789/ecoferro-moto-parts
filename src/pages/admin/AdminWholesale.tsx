import { useEffect, useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  analyzing: { label: "Em Análise", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Aprovado", color: "bg-primary/10 text-primary" },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  blocked: { label: "Bloqueado", color: "bg-muted text-muted-foreground" },
};

const AdminWholesale = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("wholesale_customers").select("*").order("created_at", { ascending: false });
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data } = await query;
      setCustomers(data || []);
      setLoading(false);
    };
    fetch();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "approved") updates.approved_at = new Date().toISOString();
    await supabase.from("wholesale_customers").update(updates).eq("id", id);
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <AdminLayout title="Clientes Atacado">
      <div className="flex items-center gap-4 mb-6">
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
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Empresa</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">CNPJ</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Contato</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Tipo</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground font-body">Nenhum cadastro atacadista</td></tr>
              ) : customers.map(c => {
                const st = statusLabels[c.status] || { label: c.status, color: "bg-muted text-muted-foreground" };
                const typeLabel: Record<string, string> = { retail: "Varejo", wholesale: "Atacado", reseller: "Revendedor", distributor: "Distribuidor" };
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-body font-medium text-foreground">{c.razao_social}<br /><span className="text-xs text-muted-foreground">{c.nome_fantasia || ""}</span></td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{c.cnpj}</td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{c.contact_name}<br />{c.email}<br />{c.phone}</td>
                    <td className="p-4"><span className="text-xs font-body px-2 py-0.5 rounded bg-muted text-foreground">{typeLabel[c.customer_type] || c.customer_type}</span></td>
                    <td className="p-4 text-center">
                      <Select value={c.status} onValueChange={v => updateStatus(c.id, v)}>
                        <SelectTrigger className={`w-32 text-xs font-body ${st.color} border-0`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
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

export default AdminWholesale;
