import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/tracking";

const OrderConfirmationPage = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!orderNumber) return;
      const { data } = await supabase
        .from("orders")
        .select("*, customers(name, email), order_items(product_name, quantity, unit_price, total)")
        .eq("order_number", parseInt(orderNumber))
        .maybeSingle();
      if (data) {
        setOrder(data);
        setItems(data.order_items || []);
      }
      setLoading(false);
    };
    fetch();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-pulse space-y-4 max-w-md mx-auto">
            <div className="h-16 w-16 bg-muted rounded-full mx-auto" />
            <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Pedido não encontrado</h1>
          <Button asChild><Link to="/">Voltar ao Início</Link></Button>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground font-body">Seu pedido <strong>#{order.order_number}</strong> foi registrado com sucesso.</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Itens do Pedido</h2>
            <div className="space-y-2">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-body text-sm font-medium">{item.product_name}</p>
                    <p className="font-body text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                  </div>
                  <span className="font-display font-bold text-sm">{formatCurrency(Number(item.total))}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            {order.shipping_cost > 0 && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Frete</span>
                <span>{formatCurrency(Number(order.shipping_cost))}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-xl font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(Number(order.total))}</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1">Pagamento</p>
              <p className="font-body text-sm capitalize">{order.payment_method?.replace("_", " ") || "Pendente"}</p>
            </div>
            <div>
              <p className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-1">Envio</p>
              <p className="font-body text-sm">{order.shipping_carrier || "A definir"}</p>
            </div>
          </div>

          {order.payment_method === "pix" && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-bold text-primary">Pagamento via Pix</h3>
              </div>
              <p className="font-body text-sm text-muted-foreground">
                Você receberá as instruções de pagamento por e-mail. Após a confirmação do pagamento, seu pedido será processado.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button className="flex-1 font-display uppercase tracking-wider" asChild>
            <Link to="/produtos">Continuar Comprando <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button variant="outline" className="flex-1 font-display uppercase tracking-wider" asChild>
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
};

export default OrderConfirmationPage;
