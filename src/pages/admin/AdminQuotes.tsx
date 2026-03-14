import { useEffect, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/tracking";

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-100 text-blue-700" },
  analyzing: { label: "Em Análise", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Enviado", color: "bg-indigo-100 text-indigo-700" },
  approved: { label: "Aprovado", color: "bg-primary/10 text-primary" },
  rejected: { label: "Recusado", color: "bg-destructive/10 text-destructive" },
};

const AdminQuotes = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(50);
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data } = await query;
      setQuotes(data || []);
      setLoading(false);
    };
    fetch();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("quotes").update({ status }).eq("id", id);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  return (
    <AdminLayout title="Orçamentos">
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
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">#</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Contato</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Empresa</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : quotes.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground font-body">Nenhum orçamento</td></tr>
              ) : quotes.map(q => {
                const st = statusLabels[q.status] || { label: q.status, color: "bg-muted text-muted-foreground" };
                return (
                  <tr key={q.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-display font-bold text-foreground">#{q.quote_number}</td>
                    <td className="p-4 font-body text-foreground">{q.contact_name}<br /><span className="text-xs text-muted-foreground">{q.email} | {q.phone}</span></td>
                    <td className="p-4 font-body text-muted-foreground text-xs">{q.company_name || "—"}<br />{q.cnpj || ""}</td>
                    <td className="p-4 text-center">
                      <Select value={q.status} onValueChange={v => updateStatus(q.id, v)}>
                        <SelectTrigger className={`w-32 text-xs font-body ${st.color} border-0`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</td>
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

export default AdminQuotes;
