import { useEffect, useState } from "react";
import { ShoppingCart, Phone, Mail, Check, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/tracking";

const AdminAbandonedCarts = () => {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<any>(null);
  const { toast } = useToast();

  const fetchCarts = async () => {
    setLoading(true);
    const { data } = await supabase.from("abandoned_carts").select("*").order("created_at", { ascending: false });
    setCarts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCarts(); }, []);

  const markContacted = async (id: string) => {
    await supabase.from("abandoned_carts").update({ contacted: true }).eq("id", id);
    toast({ title: "Marcado como contatado" }); fetchCarts();
  };

  const markRecovered = async (id: string) => {
    await supabase.from("abandoned_carts").update({ recovered: true, contacted: true }).eq("id", id);
    toast({ title: "Carrinho recuperado!" }); fetchCarts();
  };

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from("abandoned_carts").update({ notes }).eq("id", id);
    toast({ title: "Observações salvas" });
  };

  const whatsappRecovery = (cart: any) => {
    const items = Array.isArray(cart.items) ? cart.items : [];
    const itemsList = items.map((i: any) => `• ${i.name || i.product_name} (x${i.quantity})`).join("\n");
    const msg = encodeURIComponent(
      `Olá ${cart.customer_name || ""}! 👋\n\nNotamos que você deixou alguns itens no carrinho da EcoFerro:\n\n${itemsList}\n\nTotal: ${formatCurrency(cart.total || 0)}\n\nPodemos ajudar a finalizar sua compra? 🏍️`
    );
    const phone = (cart.customer_phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <AdminLayout title="Carrinhos Abandonados">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Total</p>
          <p className="font-display text-2xl font-bold">{carts.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Não contatados</p>
          <p className="font-display text-2xl font-bold text-amber-500">{carts.filter(c => !c.contacted).length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Recuperados</p>
          <p className="font-display text-2xl font-bold text-primary">{carts.filter(c => c.recovered).length}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></TableCell></TableRow>
            ) : carts.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">Nenhum carrinho abandonado</TableCell></TableRow>
            ) : carts.map(c => {
              const items = Array.isArray(c.items) ? c.items : [];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-body text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell className="font-body text-sm">{c.customer_name || "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {c.customer_phone && <p className="text-xs font-body flex items-center gap-1"><Phone className="h-3 w-3" />{c.customer_phone}</p>}
                      {c.customer_email && <p className="text-xs font-body flex items-center gap-1"><Mail className="h-3 w-3" />{c.customer_email}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="font-body text-sm">{items.length} item(ns)</TableCell>
                  <TableCell className="font-display font-bold text-sm">{formatCurrency(c.total || 0)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.recovered ? (
                        <Badge className="bg-primary/10 text-primary">Recuperado</Badge>
                      ) : c.contacted ? (
                        <Badge variant="outline">Contatado</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedCart(c)} title="Detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {c.customer_phone && (
                        <Button variant="ghost" size="icon" onClick={() => whatsappRecovery(c)} title="WhatsApp">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {!c.contacted && (
                        <Button variant="ghost" size="icon" onClick={() => markContacted(c.id)} title="Marcar contatado">
                          <Phone className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      {!c.recovered && (
                        <Button variant="ghost" size="icon" onClick={() => markRecovered(c.id)} title="Marcar recuperado">
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedCart} onOpenChange={() => setSelectedCart(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">Detalhes do Carrinho</DialogTitle></DialogHeader>
          {selectedCart && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm font-body">
                <div><span className="text-muted-foreground">Cliente:</span> {selectedCart.customer_name || "—"}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {selectedCart.customer_phone || "—"}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {selectedCart.customer_email || "—"}</div>
                <div><span className="text-muted-foreground">Data:</span> {formatDate(selectedCart.created_at)}</div>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase tracking-wider mb-2">Itens</h4>
                <div className="space-y-2">
                  {(Array.isArray(selectedCart.items) ? selectedCart.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm font-body">
                      <span>{item.name || item.product_name} x{item.quantity}</span>
                      <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-border font-display font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedCart.total || 0)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Observações</label>
                <textarea
                  rows={3}
                  defaultValue={selectedCart.notes || ""}
                  onBlur={e => updateNotes(selectedCart.id, e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Adicione observações..."
                />
              </div>
              <div className="flex gap-2">
                {selectedCart.customer_phone && (
                  <Button onClick={() => whatsappRecovery(selectedCart)} className="flex-1 font-display uppercase tracking-wider text-xs">
                    <MessageSquare className="mr-2 h-4 w-4" /> Enviar WhatsApp
                  </Button>
                )}
                {!selectedCart.recovered && (
                  <Button variant="outline" onClick={() => { markRecovered(selectedCart.id); setSelectedCart(null); }} className="flex-1 font-display uppercase tracking-wider text-xs">
                    <Check className="mr-2 h-4 w-4" /> Marcar Recuperado
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAbandonedCarts;
