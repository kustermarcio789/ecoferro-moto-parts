import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/tracking";

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage", discount_value: "",
    min_order_value: "", max_uses: "", is_active: true, is_first_purchase: false,
    valid_from: "", valid_until: "",
  });
  const { toast } = useToast();

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => setForm({
    code: "", description: "", discount_type: "percentage", discount_value: "",
    min_order_value: "", max_uses: "", is_active: true, is_first_purchase: false,
    valid_from: "", valid_until: "",
  });

  const startEdit = (c: any) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || "", discount_type: c.discount_type,
      discount_value: String(c.discount_value), min_order_value: String(c.min_order_value || ""),
      max_uses: String(c.max_uses || ""), is_active: c.is_active, is_first_purchase: c.is_first_purchase || false,
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      code: form.code.toUpperCase(), description: form.description || null,
      discount_type: form.discount_type, discount_value: Number(form.discount_value),
      min_order_value: Number(form.min_order_value) || 0,
      max_uses: Number(form.max_uses) || null,
      is_active: form.is_active, is_first_purchase: form.is_first_purchase,
      valid_from: form.valid_from || null, valid_until: form.valid_until || null,
    };
    const { error } = editing
      ? await supabase.from("coupons").update(payload).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Cupom atualizado" : "Cupom criado" });
    setShowForm(false); setEditing(null); resetForm(); fetch();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "Cupom excluído" }); fetch();
  };

  return (
    <AdminLayout title="Cupons">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground font-body">{coupons.length} cupom(ns)</p>
        <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="font-display uppercase tracking-wider text-xs">
          <Plus className="mr-2 h-4 w-4" /> Novo Cupom
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Mín. Pedido</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></TableCell></TableRow>
            ) : coupons.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">Nenhum cupom cadastrado</TableCell></TableRow>
            ) : coupons.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-display font-bold uppercase tracking-wider">{c.code}</TableCell>
                <TableCell className="font-body text-sm">{c.discount_type === "percentage" ? "Percentual" : "Fixo"}</TableCell>
                <TableCell className="font-body text-sm">{c.discount_type === "percentage" ? `${c.discount_value}%` : formatCurrency(c.discount_value)}</TableCell>
                <TableCell className="font-body text-sm">{formatCurrency(c.min_order_value || 0)}</TableCell>
                <TableCell className="font-body text-sm">{c.used_count || 0}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(c.id, c.is_active)}>
                      {c.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{editing ? "Editar Cupom" : "Novo Cupom"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Código *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Tipo de Desconto</label>
                <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Valor do Desconto *</label>
                <input type="number" step="0.01" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Pedido Mínimo</label>
                <input type="number" step="0.01" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Descrição</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Válido de</label>
                <input type="datetime-local" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Válido até</label>
                <input type="datetime-local" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Máx. Usos</label>
                <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_first_purchase} onChange={e => setForm(f => ({ ...f, is_first_purchase: e.target.checked }))} className="rounded border-border" />
                  1ª compra
                </label>
                <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-border" />
                  Ativo
                </label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full font-display uppercase tracking-wider">{editing ? "Salvar" : "Criar Cupom"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCoupons;
