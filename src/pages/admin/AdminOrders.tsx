import { useEffect, useState } from "react";
import { Search, Eye, X, Package, MapPin, CreditCard, Clock, User, Save, Truck, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/tracking";
import { updateOrderStatusWithInventory } from "@/services/inventoryService";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-primary/10 text-primary" },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Entregue", color: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
  refunded: { label: "Reembolsado", color: "bg-muted text-muted-foreground" },
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  refunded: "Reembolsado",
  in_analysis: "Em Análise",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderPayments, setOrderPayments] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editTracking, setEditTracking] = useState("");
  const [editInvoice, setEditInvoice] = useState("");
  const [editInvoiceKey, setEditInvoiceKey] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("orders").select("*, customers(name, email, phone, cpf_cnpj)").order("created_at", { ascending: false }).limit(50);
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter as any);
      const { data } = await query;
      setOrders(data || []);
      setLoading(false);
    };
    fetch();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatusWithInventory(id, status);

      const updates: any = { status };
      if (status === "paid") updates.paid_at = new Date().toISOString();
      if (status === "shipped") updates.shipped_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "cancelled" || status === "refunded") updates.cancelled_at = new Date().toISOString();
      if (status !== "cancelled" && status !== "refunded") updates.cancelled_at = null;

      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      if (selectedOrder?.id === id) setSelectedOrder((prev: any) => prev ? { ...prev, ...updates } : prev);
      toast({ title: "Status atualizado" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    }
  };

  const openDetail = async (order: any) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    const [items, payments] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", order.id).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", order.id).order("created_at"),
    ]);
    setOrderItems(items.data || []);
    setOrderPayments(payments.data || []);
    setEditTracking(order.tracking_code || "");
    setEditInvoice(order.invoice_number || "");
    setEditInvoiceKey(order.invoice_key || "");
    setEditInternalNotes(order.internal_notes || "");
    setDetailLoading(false);
  };

  const saveOrderFields = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    const updates: any = {
      tracking_code: editTracking || null,
      invoice_number: editInvoice || null,
      invoice_key: editInvoiceKey || null,
      internal_notes: editInternalNotes || null,
    };
    const { error } = await supabase.from("orders").update(updates).eq("id", selectedOrder.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo com sucesso" });
      setSelectedOrder((prev: any) => prev ? { ...prev, ...updates } : prev);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updates } : o));
    }
    setSaving(false);
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  const formatAddress = (addr: any) => {
    if (!addr) return "—";
    const parts = [addr.street, addr.number, addr.complement, addr.neighborhood, `${addr.city}/${addr.state}`, addr.zip_code].filter(Boolean);
    return parts.join(", ");
  };

  const filteredOrders = search
    ? orders.filter(o =>
        String(o.order_number).includes(search) ||
        (o.customers?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.customers?.email || "").toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <AdminLayout title="Pedidos">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs font-body"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
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
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Cliente</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Total</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Pagamento</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Data</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-4"><div className="h-12 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground font-body">Nenhum pedido encontrado</td></tr>
              ) : filteredOrders.map(o => {
                const st = statusLabels[o.status] || { label: o.status, color: "bg-muted text-muted-foreground" };
                return (
                  <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-display font-bold text-foreground">#{o.order_number}</td>
                    <td className="p-4 font-body text-foreground">{o.customers?.name || "—"}<br /><span className="text-xs text-muted-foreground">{o.customers?.email}</span></td>
                    <td className="p-4 text-right font-body font-medium">{formatCurrency(Number(o.total))}</td>
                    <td className="p-4 text-center">
                      <Select value={o.status} onValueChange={v => updateStatus(o.id, v)}>
                        <SelectTrigger className={`w-32 text-xs font-body ${st.color} border-0`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-center text-xs font-body text-muted-foreground">{o.payment_method || "—"}</td>
                    <td className="p-4 font-body text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(o)}><Eye className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">
              Pedido #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Status & Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Status</p>
                  <Select value={selectedOrder.status} onValueChange={v => updateStatus(selectedOrder.id, v)}>
                    <SelectTrigger className={`mt-1 text-xs font-body ${(statusLabels[selectedOrder.status] || {}).color || ""} border-0 h-7`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Pagamento</p>
                  <p className="text-sm font-body font-medium mt-1">{paymentStatusLabels[selectedOrder.payment_status] || selectedOrder.payment_status || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Método</p>
                  <p className="text-sm font-body font-medium mt-1">{selectedOrder.payment_method || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Canal</p>
                  <p className="text-sm font-body font-medium mt-1 capitalize">{selectedOrder.sales_channel || "—"}</p>
                </div>
              </div>

              {/* Customer */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider">Cliente</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm font-body">
                  <div><span className="text-muted-foreground">Nome:</span> {selectedOrder.customers?.name || "—"}</div>
                  <div><span className="text-muted-foreground">E-mail:</span> {selectedOrder.customers?.email || "—"}</div>
                  <div><span className="text-muted-foreground">Telefone:</span> {selectedOrder.customers?.phone || "—"}</div>
                  <div><span className="text-muted-foreground">CPF/CNPJ:</span> {selectedOrder.customers?.cpf_cnpj || "—"}</div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">Endereço de Entrega</h3>
                  </div>
                  <p className="text-sm font-body">{formatAddress(selectedOrder.shipping_address)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">Endereço de Cobrança</h3>
                  </div>
                  <p className="text-sm font-body">{formatAddress(selectedOrder.billing_address)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider">Itens do Pedido</h3>
                </div>
                {detailLoading ? (
                  <div className="h-20 bg-muted rounded-lg animate-pulse" />
                ) : orderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body p-4 bg-muted/50 rounded-lg">Nenhum item registrado</p>
                ) : (
                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th>
                          <th className="text-center p-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Qtd</th>
                          <th className="text-right p-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Unit.</th>
                          <th className="text-right p-3 text-xs font-display uppercase tracking-wider text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map(item => (
                          <tr key={item.id} className="border-b border-border/50">
                            <td className="p-3 font-body">
                              {item.product_name}
                              {item.sku && <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>}
                            </td>
                            <td className="p-3 text-center font-body">{item.quantity}</td>
                            <td className="p-3 text-right font-body">{formatCurrency(Number(item.unit_price))}</td>
                            <td className="p-3 text-right font-body font-medium">{formatCurrency(Number(item.total))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(selectedOrder.subtotal))}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-destructive">-{formatCurrency(Number(selectedOrder.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Frete ({selectedOrder.shipping_carrier || "—"})</span>
                  <span>{formatCurrency(Number(selectedOrder.shipping_cost || 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-display font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(selectedOrder.total))}</span>
                </div>
              </div>

              {/* Payments */}
              {orderPayments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">Pagamentos</h3>
                  </div>
                  <div className="space-y-2">
                    {orderPayments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm font-body">
                        <div>
                          <span className="font-medium capitalize">{p.method}</span>
                          {p.gateway && <span className="text-xs text-muted-foreground ml-2">via {p.gateway}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={p.status === "approved" ? "default" : "secondary"}>
                            {paymentStatusLabels[p.status] || p.status}
                          </Badge>
                          <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider">Histórico</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-body">
                  <div><span className="text-muted-foreground">Criado:</span> {formatDate(selectedOrder.created_at)}</div>
                  <div><span className="text-muted-foreground">Pago:</span> {formatDate(selectedOrder.paid_at)}</div>
                  <div><span className="text-muted-foreground">Enviado:</span> {formatDate(selectedOrder.shipped_at)}</div>
                  <div><span className="text-muted-foreground">Entregue:</span> {formatDate(selectedOrder.delivered_at)}</div>
                </div>
              </div>

              {/* Editable: Tracking & Invoice */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider">Rastreio & Nota Fiscal</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Código de Rastreio</label>
                    <Input value={editTracking} onChange={e => setEditTracking(e.target.value)} placeholder="Ex: BR123456789BR" className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Número da NF</label>
                    <Input value={editInvoice} onChange={e => setEditInvoice(e.target.value)} placeholder="Ex: 000123" className="mt-1 h-8 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Chave da NF-e</label>
                    <Input value={editInvoiceKey} onChange={e => setEditInvoiceKey(e.target.value)} placeholder="44 dígitos" className="mt-1 h-8 text-sm font-mono" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid sm:grid-cols-2 gap-4">
                {selectedOrder.customer_notes && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-2">Obs. do Cliente</h3>
                    <p className="text-sm font-body text-muted-foreground">{selectedOrder.customer_notes}</p>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">Obs. Internas</h3>
                  </div>
                  <textarea
                    value={editInternalNotes}
                    onChange={e => setEditInternalNotes(e.target.value)}
                    placeholder="Notas internas sobre o pedido..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-y"
                  />
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={saveOrderFields} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
