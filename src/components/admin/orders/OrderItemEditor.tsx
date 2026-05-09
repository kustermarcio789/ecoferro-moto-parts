import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/tracking";

interface Product {
  id: string;
  name: string;
  internal_code: string;
  price: number;
  wholesale_price: number | null;
  sku: string | null;
}

interface OrderItemEditorProps {
  orderId: string;
  onItemAdded: () => void;
}

export const OrderItemEditor = ({ orderId, onItemAdded }: OrderItemEditorProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 2) {
      setProducts([]);
      return;
    }

    const searchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, internal_code, price, wholesale_price, sku")
        .eq("is_active", true)
        .or(`name.ilike.%${search}%,internal_code.ilike.%${search}%`)
        .limit(5);
      
      setProducts(data || []);
    };

    const timeout = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleAdd = async () => {
    if (!selectedProduct) return;
    setLoading(true);

    try {
      const unitPrice = selectedProduct.wholesale_price || selectedProduct.price;
      const total = unitPrice * quantity;

      const { error } = await supabase.from("order_items").insert({
        order_id: orderId,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity,
        unit_price: unitPrice,
        total,
      });

      if (error) throw error;

      await supabase.rpc("recalculate_order_totals", { p_order_id: orderId });
      
      // Log action
      await supabase.from("admin_logs").insert({
        action: "order.item_added",
        entity_type: "order",
        entity_id: orderId,
        details: { 
          product_name: selectedProduct.name, 
          quantity, 
          unit_price: unitPrice 
        }
      });

      toast({ title: "Produto adicionado" });
      setIsAdding(false);
      setSearch("");
      setSelectedProduct(null);
      setQuantity(1);
      onItemAdded();
    } catch (error: any) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdding) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="w-full mt-2">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar produto
      </Button>
    );
  }

  return (
    <div className="bg-muted/30 p-3 rounded-lg border border-dashed border-border mt-2 space-y-3">
      <div className="relative">
        <Input
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
          autoFocus
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {products.length > 0 && !selectedProduct && (
        <div className="bg-background border rounded-md shadow-sm overflow-hidden">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.internal_code}</div>
              </div>
              <div className="font-medium">{formatCurrency(p.wholesale_price || p.price)}</div>
            </button>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-background p-2 rounded border">
            <div className="text-sm font-medium">{selectedProduct.name}</div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Qtd</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAdd} disabled={loading}>
                {loading ? "..." : "Adicionar"}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {!selectedProduct && search.length >= 2 && products.length === 0 && (
        <div className="text-xs text-center text-muted-foreground py-2">Nenhum produto encontrado</div>
      )}
      
      {!selectedProduct && (
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="w-full">
          Cancelar
        </Button>
      )}
    </div>
  );
};
