import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Package, User, Clock, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/tracking";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import OrderItemsTableWithImages from "@/components/OrderItemWithImage";
import OrderPrintView from "@/components/admin/OrderPrintView";

const priorityConfig: Record<string, { label: string; color: string; border: string }> = {
  normal: { label: "Normal", color: "bg-gray-100 text-gray-700", border: "border-gray-200" },
  urgent: { label: "Urgente", color: "bg-orange-100 text-orange-800", border: "border-orange-300" },
  critical: { label: "Crítica", color: "bg-red-100 text-red-800", border: "border-red-300" },
};

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*, customers(name, email, phone, cpf_cnpj)")
        .eq("id", id)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*, product:product_id(product_images(url, is_primary))")
        .eq("order_id", id)
        .order("created_at");

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setItems(itemsData || []);
    } catch (error: any) {
      toast({ title: "Erro ao carregar pedido", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save order priority and internal notes
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          priority: order.priority,
          internal_notes: order.internal_notes,
        })
        .eq("id", id);

      if (orderError) throw orderError;

      // Save item quantities
      for (const item of items) {
        const { error: itemError } = await supabase
          .from("order_items")
          .update({
            confirmed_quantity: item.confirmed_quantity,
            delivered_quantity: item.delivered_quantity,
          })
          .eq("id", item.id);
        
        if (itemError) throw itemError;
      }

      toast({ title: "Pedido atualizado com sucesso" });
      fetchOrderDetail();
    } catch (error: any) {
      toast({ title: "Erro ao salvar alterações", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  if (loading) {
    return (
      <AdminLayout title="Detalhes do Pedido">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="Pedido não encontrado">
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">O pedido solicitado não existe.</p>
          <Button onClick={() => navigate("/admin/pedidos")}>Voltar para pedidos</Button>
        </div>
      </AdminLayout>
    );
  }

  const isTotalFulfillment = items.every(it => it.confirmed_quantity === it.quantity);
  const isDelivered = items.every(it => it.delivered_quantity === (it.confirmed_quantity || 0) && it.confirmed_quantity !== null);
  const confirmedCount = items.filter(it => it.confirmed_quantity !== null).length;

  return (
    <AdminLayout title={`Pedido #${order.order_number}`}>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin/pedidos" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Pedidos
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Priority */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Status e Prioridade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium mb-1 block">Prioridade do Pedido</label>
                <Select 
                  value={order.priority || "normal"} 
                  onValueChange={(val) => setOrder({...order, priority: val})}
                >
                  <SelectTrigger className={`font-body ${priorityConfig[order.priority || "normal"].color} ${priorityConfig[order.priority || "normal"].border}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-body font-medium mb-1 block">Status de Atendimento</label>
                <div className="mt-2">
                  {isDelivered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Entregue
                    </span>
                  ) : isTotalFulfillment && confirmedCount === items.length ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Atendimento total
                    </span>
                  ) : confirmedCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> Atendimento parcial: {confirmedCount} de {items.length} itens confirmados
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aguardando confirmação de itens</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" /> Itens do Pedido
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-left p-4 text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th>
                    <th className="text-center p-4 text-xs font-display uppercase tracking-wider text-muted-foreground">Solicitada</th>
                    <th className="text-center p-4 text-xs font-display uppercase tracking-wider text-muted-foreground">Confirmada</th>
                    <th className="text-center p-4 text-xs font-display uppercase tracking-wider text-muted-foreground">Entregue</th>
                    <th className="text-right p-4 text-xs font-display uppercase tracking-wider text-muted-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="p-4 font-body">
                        <div className="font-medium">{item.product_name}</div>
                        {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                      </td>
                      <td className="p-4 text-center font-body">{item.quantity}</td>
                      <td className="p-4 text-center">
                        <Input 
                          type="number" 
                          className="w-20 mx-auto text-center h-8" 
                          value={item.confirmed_quantity ?? ""} 
                          onChange={(e) => updateItem(item.id, 'confirmed_quantity', e.target.value === "" ? null : parseInt(e.target.value))}
                        />
                      </td>
                      <td className="p-4 text-center">
                        <Input 
                          type="number" 
                          className="w-20 mx-auto text-center h-8" 
                          value={item.delivered_quantity} 
                          onChange={(e) => updateItem(item.id, 'delivered_quantity', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-4 text-right font-body font-medium">
                        {formatCurrency((item.confirmed_quantity ?? item.quantity) * Number(item.unit_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Cliente
            </h3>
            <div className="space-y-3 text-sm font-body">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tight mb-0.5">Nome / Razão Social</p>
                <p className="font-medium">{order.customers?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tight mb-0.5">CPF / CNPJ</p>
                <p className="font-medium">{order.customers?.cpf_cnpj || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tight mb-0.5">E-mail</p>
                <p className="font-medium">{order.customers?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-tight mb-0.5">Telefone</p>
                <p className="font-medium">{order.customers?.phone || "—"}</p>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-4">Notas Internas</h3>
            <Textarea 
              className="min-h-[120px] font-body text-sm" 
              placeholder="Anotações para controle interno..." 
              value={order.internal_notes || ""} 
              onChange={(e) => setOrder({...order, internal_notes: e.target.value})}
            />
          </div>

          {/* Production Shortcut */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-primary mb-2">Produção</h3>
            <p className="text-xs font-body text-muted-foreground mb-4">Gerencie as etapas e prazos de fabricação para este pedido.</p>
            <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={() => navigate('/admin/producao')}>
              Ir para Produção
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrderDetail;
