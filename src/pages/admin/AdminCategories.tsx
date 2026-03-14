import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | null;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "", slug: "", parent_id: "none", description: "", image_url: "", is_active: true, sort_order: "0",
  });
  const { toast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const classes = categories.filter(c => !c.parent_id);
  const getSubclasses = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    const slug = formData.slug || generateSlug(formData.name);
    const payload = {
      name: formData.name,
      slug,
      parent_id: formData.parent_id && formData.parent_id !== "none" ? formData.parent_id : null,
      description: formData.description || null,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      sort_order: Number(formData.sort_order) || 0,
    };

    const { error } = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Categoria atualizada" : "Categoria criada" });
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchCategories();
    }
  };

  const resetForm = () => setFormData({ name: "", slug: "", parent_id: "none", description: "", image_url: "", is_active: true, sort_order: "0" });

  const deleteCategory = async (id: string) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) { toast({ title: "Erro", description: "Remova as subclasses antes de excluir esta classe.", variant: "destructive" }); return; }
    if (!confirm("Excluir esta categoria?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast({ title: "Categoria excluída" });
    fetchCategories();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_active: !current }).eq("id", id);
    fetchCategories();
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setFormData({
      name: c.name, slug: c.slug, parent_id: c.parent_id || "none",
      description: c.description || "", image_url: c.image_url || "",
      is_active: c.is_active, sort_order: String(c.sort_order || 0),
    });
    setShowForm(true);
  };

  const filtered = search ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : null;

  return (
    <AdminLayout title="Classes e Subclasses">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar categorias..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button onClick={() => { setEditing(null); resetForm(); setShowForm(true); }} className="font-display uppercase tracking-wider text-xs">
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
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
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Classe pai (deixe vazio para criar uma classe principal)</label>
              <Select value={formData.parent_id} onValueChange={v => setFormData(f => ({ ...f, parent_id: v }))}>
                <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Nenhuma (Classe principal)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Classe principal)</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Descrição</label>
              <textarea rows={3} value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Ordem</label>
                <input type="number" value={formData.sort_order} onChange={e => setFormData(f => ({ ...f, sort_order: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                  Ativa
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="font-display uppercase tracking-wider text-xs">{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hierarchical view */}
      {filtered ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Categoria</th>
              <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Tipo</th>
              <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
              <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-4 font-body font-medium text-foreground">{c.name}</td>
                  <td className="p-4 text-xs font-body text-muted-foreground">{c.parent_id ? "Subclasse" : "Classe"}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleActive(c.id, c.is_active)}
                      className={`px-2 py-0.5 rounded text-xs font-body font-medium ${c.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Ativa" : "Inativa"}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)
          ) : classes.map(cls => (
            <div key={cls.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-foreground uppercase tracking-wider">{cls.name}</span>
                  <span className="text-xs text-muted-foreground font-body">/{cls.slug}</span>
                  <button onClick={() => toggleActive(cls.id, cls.is_active)}
                    className={`px-2 py-0.5 rounded text-[10px] font-body font-medium ${cls.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {cls.is_active ? "Ativa" : "Inativa"}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cls)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(cls.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {getSubclasses(cls.id).length > 0 && (
                <div className="divide-y divide-border">
                  {getSubclasses(cls.id).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-4 py-3 pl-8 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-body text-sm text-foreground">{sub.name}</span>
                        <span className="text-[10px] text-muted-foreground font-body">/{sub.slug}</span>
                        <button onClick={() => toggleActive(sub.id, sub.is_active)}
                          className={`px-2 py-0.5 rounded text-[10px] font-body font-medium ${sub.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {sub.is_active ? "Ativa" : "Inativa"}
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(sub)}><Edit className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(sub.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCategories;
