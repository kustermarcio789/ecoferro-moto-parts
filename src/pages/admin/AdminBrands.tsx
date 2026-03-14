import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminBrands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ name: "", slug: "", logo_url: "", is_active: true });
  const { toast } = useToast();

  const fetchBrands = async () => {
    setLoading(true);
    let query = supabase.from("brands").select("*").order("name");
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setBrands(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBrands(); }, [search]);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    const slug = formData.slug || generateSlug(formData.name);
    const payload = { name: formData.name, slug, logo_url: formData.logo_url || null, is_active: formData.is_active };

    const { error } = editing
      ? await supabase.from("brands").update(payload).eq("id", editing.id)
      : await supabase.from("brands").insert(payload);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Marca atualizada" : "Marca criada" });
      setShowForm(false);
      setEditing(null);
      setFormData({ name: "", slug: "", logo_url: "", is_active: true });
      fetchBrands();
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Excluir esta marca?")) return;
    await supabase.from("brands").delete().eq("id", id);
    toast({ title: "Marca excluída" });
    fetchBrands();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("brands").update({ is_active: !current }).eq("id", id);
    fetchBrands();
  };

  const startEdit = (b: Brand) => {
    setEditing(b);
    setFormData({ name: b.name, slug: b.slug, logo_url: b.logo_url || "", is_active: b.is_active });
    setShowForm(true);
  };

  return (
    <AdminLayout title="Marcas">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar marcas..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button onClick={() => { setEditing(null); setFormData({ name: "", slug: "", logo_url: "", is_active: true }); setShowForm(true); }} className="font-display uppercase tracking-wider text-xs">
          <Plus className="mr-2 h-4 w-4" /> Nova Marca
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">{editing ? "Editar Marca" : "Nova Marca"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Nome *</label>
              <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Slug</label>
              <input value={formData.slug} onChange={e => setFormData(f => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">URL do Logo</label>
              <input value={formData.logo_url} onChange={e => setFormData(f => ({ ...f, logo_url: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              Ativa
            </label>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="font-display uppercase tracking-wider text-xs">{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Marca</th>
              <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Slug</th>
              <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
              <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={4} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>)
            ) : brands.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground font-body">Nenhuma marca encontrada</td></tr>
            ) : brands.map(b => (
              <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {b.logo_url && <img src={b.logo_url} alt={b.name} className="h-8 w-8 rounded object-contain" />}
                    <span className="font-body font-medium text-foreground">{b.name}</span>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground font-body text-xs">{b.slug}</td>
                <td className="p-4 text-center">
                  <button onClick={() => toggleActive(b.id, b.is_active)}
                    className={`px-2 py-0.5 rounded text-xs font-body font-medium cursor-pointer ${b.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {b.is_active ? "Ativa" : "Inativa"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBrand(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminBrands;
