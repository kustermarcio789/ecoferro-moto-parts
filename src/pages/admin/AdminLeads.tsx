import { useEffect, useState } from "react";
import { Trash2, Download, Pencil, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sourceLabels: Record<string, string> = {
  newsletter: "Newsletter",
  contact_form: "Formulário Contato",
  quote_form: "Orçamento",
  abandoned_cart: "Carrinho Abandonado",
  popup: "Pop-up",
  whatsapp: "WhatsApp",
  other: "Mercado Livre",
};

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  message: string | null;
  status: string | null;
  metadata: any;
  created_at: string;
};

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (sourceFilter && sourceFilter !== "all") query = query.eq("source", sourceFilter as any);
    const { data } = await query;
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [sourceFilter]);

  const exportCSV = () => {
    const csv = ["Nome,Email,Telefone,Origem,Data"]
      .concat(
        leads.map(
          (l) =>
            `"${l.name || ""}","${l.email || ""}","${l.phone || ""}","${
              sourceLabels[l.source] || l.source
            }","${new Date(l.created_at).toLocaleDateString("pt-BR")}"`
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({
        name: editingLead.name,
        email: editingLead.email,
        phone: editingLead.phone,
        message: editingLead.message,
        status: editingLead.status,
      })
      .eq("id", editingLead.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Lead atualizado!");
      setEditingLead(null);
      fetchLeads();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("leads").delete().eq("id", confirmDelete.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Lead excluído!");
      setConfirmDelete(null);
      fetchLeads();
    }
  };

  const handleClearAllML = async () => {
    const { error, count } = await supabase
      .from("leads")
      .delete({ count: "exact" })
      .eq("source", "other");
    if (error) {
      toast.error("Erro ao limpar: " + error.message);
    } else {
      toast.success(`${count || 0} leads do ML removidos!`);
      setConfirmClearAll(false);
      fetchLeads();
    }
  };

  return (
    <AdminLayout title="Leads">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48 text-xs font-body">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(sourceLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => setConfirmClearAll(true)}
            className="font-display uppercase tracking-wider text-xs"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Limpar Leads ML
          </Button>
          <Button
            variant="outline"
            onClick={exportCSV}
            className="font-display uppercase tracking-wider text-xs"
          >
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
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
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Origem</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Data</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-4">
                      <div className="h-10 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground font-body">
                    Nenhum lead
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-body font-medium text-foreground">{l.name || "—"}</td>
                    <td className="p-4 font-body text-muted-foreground text-xs">{l.email || "—"}</td>
                    <td className="p-4 font-body text-muted-foreground text-xs">{l.phone || "—"}</td>
                    <td className="p-4">
                      <span className="text-xs font-body px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {sourceLabels[l.source] || l.source}
                      </span>
                    </td>
                    <td className="p-4 font-body text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingLead(l)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(l)}
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

      {/* Dialog de edição */}
      <Dialog open={!!editingLead} onOpenChange={(o) => !o && setEditingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editingLead.name || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editingLead.email || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editingLead.phone || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Input
                  value={editingLead.status || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                  placeholder="new, contacted, qualified, converted"
                />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={editingLead.message || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, message: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLead(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão individual */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Excluir Lead
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o lead <strong>{confirmDelete?.name || "sem nome"}</strong>?
            Esta ação não pode ser desfeita.
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

      {/* Dialog de limpar todos os leads ML */}
      <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Limpar Leads do ML
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso vai remover <strong>TODOS</strong> os leads originados do Mercado Livre (origem: Outro).
            Leads orgânicos (newsletter, contato, etc.) serão mantidos. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClearAll(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClearAllML}>
              Limpar Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminLeads;
