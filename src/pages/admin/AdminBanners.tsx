import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const AdminBanners = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", subtitle: "", image_url: "", link: "", position: "hero",
    is_active: true, sort_order: "0", starts_at: "", ends_at: "",
  });
  const { toast } = useToast();

  const fetchBanners = async () => {
    setLoading(true);
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const resetForm = () => setForm({
    title: "", subtitle: "", image_url: "", link: "", position: "hero",
    is_active: true, sort_order: "0", starts_at: "", ends_at: "",
  });

  const startEdit = (b: any) => {
    setEditing(b);
    setForm({
      title: b.title, subtitle: b.subtitle || "", image_url: b.image_url,
      link: b.link || "", position: b.position || "hero", is_active: b.is_active,
      sort_order: String(b.sort_order || 0),
      starts_at: b.starts_at ? b.starts_at.slice(0, 16) : "",
      ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title, subtitle: form.subtitle || null, image_url: form.image_url,
      link: form.link || null, position: form.position, is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      starts_at: form.starts_at || null, ends_at: form.ends_at || null,
    };
    const { error } = editing
      ? await supabase.from("banners").update(payload).eq("id", editing.id)
      : await supabase.from("banners").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Banner atualizado" : "Banner criado" });
    setShowForm(false); setEditing(null); resetForm(); fetchBanners();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("banners").update({ is_active: !current }).eq("id", id);
    fetchBanners();
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Excluir este banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    toast({ title: "Banner excluído" }); fetchBanners();
  };

  return (
    <AdminLayout title="Banners">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground font-body">{banners.length} banner(s)</p>
        <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="font-display uppercase tracking-wider text-xs">
          <Plus className="mr-2 h-4 w-4" /> Novo Banner
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></TableCell></TableRow>
            ) : banners.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-body">Nenhum banner cadastrado</TableCell></TableRow>
            ) : banners.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-body text-sm text-muted-foreground">{b.sort_order}</TableCell>
                <TableCell>
                  <div className="h-12 w-24 rounded-lg overflow-hidden bg-muted">
                    <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-display text-sm font-semibold uppercase tracking-wider">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-muted-foreground font-body">{b.subtitle}</p>}
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{b.position}</Badge></TableCell>
                <TableCell><Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(b.id, b.is_active)}>
                      {b.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(b)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteBanner(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{editing ? "Editar Banner" : "Novo Banner"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Subtítulo</label>
              <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">URL da Imagem *</label>
              <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Link (destino)</label>
                <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Posição</label>
                <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="hero">Hero</option>
                  <option value="catalog">Catálogo</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="popup">Pop-up</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Ordem</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Início</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Término</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-border" />
              Banner ativo
            </label>
            <Button onClick={handleSave} className="w-full font-display uppercase tracking-wider">{editing ? "Salvar" : "Criar Banner"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBanners;
