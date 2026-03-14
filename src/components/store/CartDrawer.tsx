import { Link } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const CartDrawer = () => {
  const { items, removeItem, updateQuantity, subtotal, totalItems, isOpen, setIsOpen } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={() => setIsOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card z-[71] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display text-lg uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Carrinho ({totalItems})
          </h2>
          <button onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-body">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Seu carrinho está vazio</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(false)} asChild>
                <Link to="/produtos">Ver Produtos</Link>
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-border pb-4">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-20 w-20 object-cover rounded-lg" />
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/produto/${item.slug}`} className="font-display text-sm font-semibold text-foreground line-clamp-2 hover:text-primary" onClick={() => setIsOpen(false)}>
                    {item.name}
                  </Link>
                  <p className="text-primary font-display font-bold mt-1">
                    R$ {item.price.toFixed(2).replace(".", ",")}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-body w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-muted">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex justify-between font-display text-lg">
              <span>Subtotal</span>
              <span className="font-bold text-primary">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
            </div>
            <Button className="w-full font-display uppercase tracking-wider" asChild onClick={() => setIsOpen(false)}>
              <Link to="/carrinho">Finalizar Compra</Link>
            </Button>
            <Button variant="outline" className="w-full font-display uppercase tracking-wider text-xs" onClick={() => setIsOpen(false)}>
              Continuar Comprando
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
