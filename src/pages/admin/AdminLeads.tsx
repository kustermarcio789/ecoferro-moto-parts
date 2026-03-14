import { useEffect, useState } from "react";
import { Search, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const sourceLabels: Record<string, string> = {
  newsletter: "Newsletter",
  contact_form: "Formulário Contato",
  quote_form: "Orçamento",
  abandoned_cart: "Carrinho Abandonado",
  popup: "Pop-up",
  whatsapp: "WhatsApp",
  other: "Outro",
};

const AdminLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(100);
      if (sourceFilter) query = query.eq("source", sourceFilter as any);
      const { data } = await query;
      setLeads(data || []);
      setLoading(false);
    };
    fetch();
  }, [sourceFilter]);

  const exportCSV = () => {
    const csv = ["Nome,Email,Telefone,Origem,Data"].concat(
      leads.map(l => `"${l.name || ""}","${l.email || ""}","${l.phone || ""}","${sourceLabels[l.source] || l.source}","${new Date(l.created_at).toLocaleDateString("pt-BR")}"`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
  };

  return (
    <AdminLayout title="Leads">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48 text-xs font-body"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} className="font-display uppercase tracking-wider text-xs">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Nome</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">E-mail</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Telefone</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Origem</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground font-body">Nenhum lead</td></tr>
              ) : leads.map(l => (
                <tr key={l.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-body font-medium text-foreground">{l.name || "—"}</td>
                  <td className="p-4 font-body text-muted-foreground text-xs">{l.email || "—"}</td>
                  <td className="p-4 font-body text-muted-foreground text-xs">{l.phone || "—"}</td>
                  <td className="p-4"><span className="text-xs font-body px-2 py-0.5 rounded bg-primary/10 text-primary">{sourceLabels[l.source] || l.source}</span></td>
                  <td className="p-4 font-body text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLeads;
