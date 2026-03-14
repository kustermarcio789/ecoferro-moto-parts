import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

const CartPage = () => {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState("");

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-30" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Seu carrinho está vazio</h1>
          <p className="text-muted-foreground font-body mb-8">Explore nossos produtos e encontre peças para sua moto.</p>
          <Button size="lg" className="font-display uppercase tracking-wider" asChild>
            <Link to="/produtos">Ver Produtos</Link>
          </Button>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground uppercase tracking-wide mb-8">Carrinho</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 p-4 bg-card rounded-xl border border-border">
                {item.image && (
                  <Link to={`/produto/${item.slug}`}>
                    <img src={item.image} alt={item.name} className="h-24 w-24 object-cover rounded-lg" />
                  </Link>
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/produto/${item.slug}`} className="font-display text-sm font-semibold text-foreground hover:text-primary line-clamp-2">
                    {item.name}
                  </Link>
                  <p className="text-primary font-display font-bold text-lg mt-1">
                    R$ {item.price.toFixed(2).replace(".", ",")}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-border rounded-lg">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1.5 hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-4 py-1.5 text-sm font-body border-x border-border">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1.5 hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display font-bold text-foreground">
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-24">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-6">Resumo do Pedido</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-muted-foreground">Calcular no checkout</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Cupom de desconto"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" size="sm" className="font-display uppercase tracking-wider text-xs">
                Aplicar
              </Button>
            </div>

            <div className="border-t border-border pt-4 mb-6">
              <div className="flex justify-between font-display text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-xs text-muted-foreground font-body mt-1">
                ou R$ {(subtotal * 0.95).toFixed(2).replace(".", ",")} no Pix
              </p>
            </div>

            <Button className="w-full font-display uppercase tracking-wider text-base py-6" size="lg">
              Finalizar Compra
            </Button>

            <Button variant="ghost" className="w-full mt-2 font-body text-sm" asChild>
              <Link to="/produtos">
                <ArrowLeft className="mr-2 h-4 w-4" /> Continuar comprando
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <StoreFooter />
    </div>
  );
};

export default CartPage;
