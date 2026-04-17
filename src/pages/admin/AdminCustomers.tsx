import { useEffect, useState } from "react";
import { Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  company_name: string | null;
  is_company: boolean;
  notes: string | null;
  created_at: string;
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [confirmClearML, setConfirmClearML] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    let query = supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: editing.name,
        email: editing.email,
        phone: editing.phone,
        cpf_cnpj: editing.cpf_cnpj,
        company_name: editing.company_name,
        is_company: editing.is_company,
        notes: editing.notes,
      })
      .eq("id", editing.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Cliente atualizado!");
      setEditing(null);
      fetchCustomers();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    // Apagar endereços primeiro (FK)
    await supabase.from("addresses").delete().eq("customer_id", confirmDelete.id);
    const { error } = await supabase.from("customers").delete().eq("id", confirmDelete.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Cliente excluído!");
      setConfirmDelete(null);
      fetchCustomers();
    }
  };

  const handleClearML = async () => {
    // Apagar endereços ML primeiro
    await supabase.from("addresses").delete().eq("label", "Mercado Livre");
    const { error, count } = await supabase
      .from("customers")
      .delete({ count: "exact" })
      .ilike("notes", "%Mercado Livre%");
    if (error) {
      toast.error("Erro ao limpar: " + error.message);
    } else {
      toast.success(`${count || 0} clientes do ML removidos!`);
      setConfirmClearML(false);
      fetchCustomers();
    }
  };

  return (
    <AdminLayout title="Clientes">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button
          variant="destructive"
          onClick={() => setConfirmClearML(true)}
          className="font-display uppercase tracking-wider text-xs"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Limpar Clientes ML
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
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">CPF/CNPJ</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Desde</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-4">
                      <div className="h-10 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground font-body">
                    Nenhum cliente
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-body font-medium text-foreground">{c.name}</td>
                    <td className="p-4 font-body text-muted-foreground text-xs">{c.email || "—"}</td>
                    <td className="p-4 font-body text-muted-foreground text-xs">{c.phone || "—"}</td>
                    <td className="p-4 font-body text-muted-foreground text-xs">{c.cpf_cnpj || "—"}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-body px-2 py-0.5 rounded ${
                          c.is_company ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.is_company ? "Empresa" : "PF"}
                      </span>
                    </td>
                    <td className="p-4 font-body text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(c)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(c)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Nome</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editing.email || ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editing.phone || ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={editing.cpf_cnpj || ""}
                  onChange={(e) => setEditing({ ...editing, cpf_cnpj: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_company"
                  checked={editing.is_company}
                  onChange={(e) => setEditing({ ...editing, is_company: e.target.checked })}
                />
                <Label htmlFor="is_company">É empresa (CNPJ)</Label>
              </div>
              {editing.is_company && (
                <div>
                  <Label>Razão Social</Label>
                  <Input
                    value={editing.company_name || ""}
                    onChange={(e) => setEditing({ ...editing, company_name: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{confirmDelete?.name}</strong>? Os endereços e
            histórico também serão removidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limpar ML */}
      <Dialog open={confirmClearML} onOpenChange={setConfirmClearML}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Limpar Clientes do ML
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso vai remover <strong>TODOS</strong> os clientes originados do Mercado Livre e seus
            endereços. Clientes cadastrados manualmente serão mantidos. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClearML(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClearML}>
              Limpar Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomers;
