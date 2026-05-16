import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Minus, Plus, Search, ShoppingCart, Trash2, Clock } from "lucide-react";
import WholesalePortalLayout from "@/components/wholesale/WholesalePortalLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { ProductImagePreview } from "@/components/shared/ProductImagePreview";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductRow {
  id: string;
  internal_code: string | null;
  name: string;
  description: string | null;
  price: number;
  wholesale_price: number | null;
  moq: number | null;
  brand_id: string | null;
  brand_name: string | null;
  primary_image: string | null;
  images: { url: string; is_primary: boolean }[];
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const WholesaleCatalog = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useWholesaleCart();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestedDate, setRequestedDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("products")
        .select(
          `id, internal_code, name, description, price, wholesale_price, moq, brand_id,
           brands:brand_id(name),
           product_images(url, is_primary, sort_order)`,
        )
        .eq("is_active", true)
        .eq("visible_wholesale", true)
        .order("internal_code", { ascending: true })
        .limit(2000),
    ]).then(([b, p]) => {
      setBrands(b.data || []);
      const list: ProductRow[] = ((p.data as any[]) || []).map((row) => {
        const imgs = (row.product_images || []).slice().sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
        return {
          id: row.id,
          internal_code: row.internal_code,
          name: row.name,
          description: row.description,
          price: Number(row.price ?? 0),
          wholesale_price: row.wholesale_price != null ? Number(row.wholesale_price) : null,
          moq: row.moq,
          brand_id: row.brand_id,
          brand_name: row.brands?.name ?? null,
          primary_image: imgs[0]?.url ?? null,
          images: imgs.map((img: any) => ({ url: img.url, is_primary: !!img.is_primary })),
        };
      });
      setProducts(list);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (brandFilter !== "all" && p.brand_id !== brandFilter) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.internal_code ?? "").toLowerCase().includes(term) ||
        (p.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, search, brandFilter]);

  const incrementForProduct = (p: ProductRow) => {
    const moq = p.moq ?? 1;
    const existing = cart.items.find((i) => i.product_id === p.id);
    const newQty = (existing?.quantity ?? 0) + moq;
    if (existing) {
      cart.setQuantity(p.id, newQty);
    } else {
      cart.add({
        product_id: p.id,
        internal_code: p.internal_code ?? "",
        name: p.name,
        unit_price: p.wholesale_price ?? p.price,
        quantity: moq,
        moq,
        image_url: p.primary_image,
        priority: "normal",
      });
    }
  };

  const submit = async () => {
    if (cart.items.length === 0) {
      toast({ title: "Carrinho vazio", description: "Selecione pelo menos um produto.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const items = cart.items.map((i) => ({ 
        product_id: i.product_id, 
        quantity: i.quantity,
        priority: i.priority
      }));
      const { data, error } = await supabase.rpc("create_wholesale_order", {
        p_items: items,
        p_requested_delivery_date: requestedDate || null,
        p_atacadista_notes: notes || null,
      });
      if (error) throw error;
      const orderId = (data as any)?.order_id;
      cart.clear();
      toast({ title: "Pedido enviado!", description: "Acompanhe o progresso na sua área de pedidos." });
      if (orderId) navigate(`/atacado/pedidos/${orderId}`);
      else navigate("/atacado/pedidos");
    } catch (err: any) {
      toast({ title: "Erro ao enviar pedido", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WholesalePortalLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground">
              Catálogo Atacado
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3 mb-4">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, nome ou descrição..."
                className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todas as marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground font-body text-sm">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.slice(0, 200).map((p) => {
                const inCart = cart.items.find((i) => i.product_id === p.id);
                const price = p.wholesale_price ?? p.price;
                return (
                  <div
                    key={p.id}
                    className="bg-card border border-border rounded-xl p-3 flex flex-col"
                  >
                    <ProductImagePreview 
                      images={p.images} 
                      name={p.name} 
                      className="mb-3"
                    />
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-wider font-display text-muted-foreground">
                        {p.internal_code} {p.brand_name ? `· ${p.brand_name}` : ""}
                      </div>
                      <div className="font-body font-medium text-foreground text-sm leading-tight line-clamp-2">
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">
                          {p.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <div className="text-xs text-muted-foreground font-body">Preço atacado</div>
                        <div className="font-display font-bold text-primary">{formatBRL(price)}</div>
                        {p.moq && p.moq > 1 && (
                          <div className="text-[10px] text-muted-foreground font-body">MOQ: {p.moq}</div>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                          <button
                            onClick={() => cart.setQuantity(p.id, inCart.quantity - 1)}
                            className="h-7 w-7 rounded-md hover:bg-background flex items-center justify-center"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={inCart.quantity}
                            onChange={(e) => cart.setQuantity(p.id, Number(e.target.value || 0))}
                            className="w-12 text-center bg-transparent text-sm font-body font-medium focus:outline-none"
                          />
                          <button
                            onClick={() => cart.setQuantity(p.id, inCart.quantity + 1)}
                            className="h-7 w-7 rounded-md hover:bg-background flex items-center justify-center"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => incrementForProduct(p)}>
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-display uppercase tracking-wider font-bold text-foreground mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Resumo do pedido
            </h2>
            {cart.items.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body py-6 text-center">
                Adicione produtos para iniciar a solicitação.
              </p>
            ) : (
              <>
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {cart.items.map((i) => (
                    <div key={i.product_id} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-body text-sm truncate text-foreground">{i.name}</div>
                          <div className="text-xs text-muted-foreground font-body">
                            {i.quantity} × {formatBRL(i.unit_price)}
                          </div>
                        </div>
                        <button
                          onClick={() => cart.remove(i.product_id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={i.priority} onValueChange={(val: any) => cart.setPriority(i.product_id, val)}>
                          <SelectTrigger 
                            className={`h-7 px-2 text-[10px] font-body w-28 ${
                              i.priority === 'urgent' 
                                ? 'text-orange-600 border-orange-200 focus:ring-orange-500' 
                                : i.priority === 'critical'
                                ? 'text-red-600 border-red-200 focus:ring-red-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <SelectValue placeholder="Prioridade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal" className="text-xs font-body">Normal</SelectItem>
                            <SelectItem value="urgent" className="text-xs font-body text-orange-600">Urgente</SelectItem>
                            <SelectItem value="critical" className="text-xs font-body text-red-600">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
                <hr className="my-3 border-border" />
                <div className="flex items-center justify-between text-sm font-body mb-1">
                  <span className="text-muted-foreground">Itens</span>
                  <span>{cart.items.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-body mb-1">
                  <span className="text-muted-foreground">Unidades</span>
                  <span>{cart.totalUnits}</span>
                </div>
                <div className="flex items-center justify-between text-base font-display font-bold mb-3">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(cart.totalValue)}</span>
                </div>
              </>
            )}

            <div className="space-y-4">
              <div className="pt-2">
                <p className="text-[10px] text-muted-foreground font-body leading-tight">
                  A equipe pode revisar a prioridade dos itens conforme disponibilidade.
                </p>
              </div>

              <div>
                <label className="text-xs font-body text-foreground mb-1 block">Prazo desejado</label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body"
                />
              </div>
              <div>
                <label className="text-xs font-body text-foreground mb-1 block">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Combinados, prioridades, frete..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body resize-none"
                />
              </div>
            </div>

            <Button
              className="w-full mt-4 font-display uppercase tracking-wider"
              onClick={submit}
              disabled={submitting || cart.items.length === 0}
              size="lg"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Solicitar Pedido"}
            </Button>
            {cart.items.length > 0 && (
              <button
                onClick={() => cart.clear()}
                className="w-full mt-2 text-xs text-muted-foreground font-body hover:text-destructive"
              >
                Limpar carrinho
              </button>
            )}
            <Link to="/atacado/painel" className="block mt-3 text-center text-xs text-muted-foreground hover:text-foreground">
              ← Voltar ao painel
            </Link>
          </div>
        </aside>
      </div>
    </WholesalePortalLayout>
  );
};

export default WholesaleCatalog;
