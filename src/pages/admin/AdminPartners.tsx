import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Users, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  analyzing: { label: "Em Análise", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Aprovado", color: "bg-primary/10 text-primary" },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  blocked: { label: "Bloqueado", color: "bg-muted text-muted-foreground" },
};

const typeLabels: Record<string, string> = {
  affiliate: "Afiliado",
  reseller: "Revendedor",
  commercial_partner: "Parceiro",
  distributor: "Distribuidor",
};

const emptyForm = {
  contact_name: "", company_name: "", email: "", phone: "",
  type: "affiliate", referral_code: "", coupon_code: "",
  commission_type: "percentage", commission_value: "10",
  cnpj: "", city: "", state: "", segment: "", notes: "",
};

const AdminPartners = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPartners = async () => {
    setLoading(true);
    let query = supabase.from("partners").select("*").order("created_at", { ascending: false });
    if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setPartners(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "approved") updates.approved_at = new Date().toISOString();
    await supabase.from("partners").update(updates).eq("id", id);
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const openNew = () => {
    setEditing(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setFormData({
      contact_name: p.contact_name || "", company_name: p.company_name || "",
      email: p.email || "", phone: p.phone || "", type: p.type || "affiliate",
      referral_code: p.referral_code || "", coupon_code: p.coupon_code || "",
      commission_type: p.commission_type || "percentage",
      commission_value: String(p.commission_value ?? "10"),
      cnpj: p.cnpj || "", city: p.city || "", state: p.state || "",
      segment: p.segment || "", notes: p.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.contact_name || !formData.email) {
      toast({ title: "Preencha nome e e-mail", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      contact_name: formData.contact_name, company_name: formData.company_name || null,
      email: formData.email, phone: formData.phone || null, type: formData.type,
      referral_code: formData.referral_code || null, coupon_code: formData.coupon_code || null,
      commission_type: formData.commission_type, commission_value: parseFloat(formData.commission_value) || 0,
      cnpj: formData.cnpj || null, city: formData.city || null, state: formData.state || null,
      segment: formData.segment || null, notes: formData.notes || null,
    };
    const { error } = editing
      ? await supabase.from("partners").update(payload).eq("id", editing.id)
      : await supabase.from("partners").insert({ ...payload, status: "approved" });

    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Parceiro atualizado" : "Parceiro criado" });
      setShowForm(false);
      fetchPartners();
    }
  };

  const deletePartner = async (id: string) => {
    if (!confirm("Excluir este parceiro?")) return;
    await supabase.from("partners").delete().eq("id", id);
    toast({ title: "Parceiro excluído" });
    fetchPartners();
  };

  const f = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  const totalPartners = partners.length;
  const approvedPartners = partners.filter(p => p.status === "approved").length;
  const totalCommission = partners.reduce((acc, p) => acc + (Number(p.commission_value) || 0), 0);
  const pendingPartners = partners.filter(p => p.status === "pending").length;

  return (
    <AdminLayout title="Parceiros & Afiliados">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de Parceiros", value: totalPartners, icon: Users, color: "text-primary" },
          { label: "Aprovados", value: approvedPartners, icon: Users, color: "text-primary" },
          { label: "Pendentes", value: pendingPartners, icon: TrendingUp, color: "text-amber-600" },
          { label: "Comissão Média", value: totalPartners > 0 ? `${(totalCommission / totalPartners).toFixed(1)}%` : "0%", icon: DollarSign, color: "text-primary" },
        ].map((m, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">{m.label}</span>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs font-body"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="font-display uppercase tracking-wider text-xs">
          <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">{editing ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Nome do Contato *</label>
                <Input value={formData.contact_name} onChange={e => f("contact_name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Empresa</label>
                <Input value={formData.company_name} onChange={e => f("company_name", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">E-mail *</label>
                <Input type="email" value={formData.email} onChange={e => f("email", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Telefone</label>
                <Input value={formData.phone} onChange={e => f("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Tipo</label>
                <Select value={formData.type} onValueChange={v => f("type", v)}>
                  <SelectTrigger className="text-sm font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">CNPJ</label>
                <Input value={formData.cnpj} onChange={e => f("cnpj", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Código Referência</label>
                <Input value={formData.referral_code} onChange={e => f("referral_code", e.target.value)} placeholder="ex: ECO10" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Cupom</label>
                <Input value={formData.coupon_code} onChange={e => f("coupon_code", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Comissão (%)</label>
                <Input type="number" value={formData.commission_value} onChange={e => f("commission_value", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Cidade</label>
                <Input value={formData.city} onChange={e => f("city", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Estado</label>
                <Input value={formData.state} onChange={e => f("state", e.target.value)} maxLength={2} placeholder="SP" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Segmento</label>
                <Input value={formData.segment} onChange={e => f("segment", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Observações</label>
              <textarea value={formData.notes} onChange={e => f("notes", e.target.value)} rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="font-display uppercase tracking-wider text-xs">
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : partners.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground font-body">Nenhum parceiro cadastrado</td></tr>
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
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePartner(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
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
