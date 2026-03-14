import { useEffect, useState } from "react";
import { Search, Eye, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(50);
      if (search) query = query.ilike("name", `%${search}%`);
      const { data } = await query;
      setCustomers(data || []);
      setLoading(false);
    };
    fetch();
  }, [search]);

  return (
    <AdminLayout title="Clientes">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Nome</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">E-mail</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Telefone</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">CPF/CNPJ</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Desde</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground font-body">Nenhum cliente</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-body font-medium text-foreground">{c.name}</td>
                  <td className="p-4 font-body text-muted-foreground text-xs">{c.email || "—"}</td>
                  <td className="p-4 font-body text-muted-foreground text-xs">{c.phone || "—"}</td>
                  <td className="p-4 font-body text-muted-foreground text-xs">{c.cpf_cnpj || "—"}</td>
                  <td className="p-4"><span className={`text-xs font-body px-2 py-0.5 rounded ${c.is_company ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>{c.is_company ? "Empresa" : "PF"}</span></td>
                  <td className="p-4 font-body text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
