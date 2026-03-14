import { useEffect, useState } from "react";
import { Plus, Search, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const AdminPartners = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("partners").select("*").order("created_at", { ascending: false });
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data } = await query;
      setPartners(data || []);
      setLoading(false);
    };
    fetch();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "approved") updates.approved_at = new Date().toISOString();
    await supabase.from("partners").update(updates).eq("id", id);
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const typeLabels: Record<string, string> = {
    affiliate: "Afiliado",
    reseller: "Revendedor",
    commercial_partner: "Parceiro",
    distributor: "Distribuidor",
  };

  return (
    <AdminLayout title="Parceiros & Afiliados">
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
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Nome</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Contato</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Código</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Comissão</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : partners.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground font-body">Nenhum parceiro cadastrado</td></tr>
              ) : partners.map(p => {
                const st = statusLabels[p.status] || { label: p.status, color: "bg-muted text-muted-foreground" };
                return (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-body font-medium text-foreground">{p.contact_name}<br /><span className="text-xs text-muted-foreground">{p.company_name || ""}</span></td>
                    <td className="p-4"><span className="text-xs font-body px-2 py-0.5 rounded bg-muted text-foreground">{typeLabels[p.type] || p.type}</span></td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{p.email}<br />{p.phone || ""}</td>
                    <td className="p-4 font-body text-xs text-primary font-medium">{p.referral_code || "—"}</td>
                    <td className="p-4 font-body text-xs text-foreground">{p.commission_value}%</td>
                    <td className="p-4 text-center">
                      <Select value={p.status} onValueChange={v => updateStatus(p.id, v)}>
                        <SelectTrigger className={`w-32 text-xs font-body ${st.color} border-0`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
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

export default AdminPartners;
