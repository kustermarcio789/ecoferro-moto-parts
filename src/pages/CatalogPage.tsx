import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Filter, ShoppingCart, Star, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  stock: number;
  is_new: boolean;
  product_images: { url: string; is_primary: boolean }[];
  categories: { name: string } | null;
  reviews: { rating: number }[];
}

const ITEMS_PER_PAGE = 12;

const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { addItem } = useCart();

  const q = searchParams.get("q") || "";
  const categoria = searchParams.get("categoria") || "";
  const sort = searchParams.get("sort") || "relevancia";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    supabase.from("categories").select("name, slug").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("id, name, slug, price, original_price, stock, is_new, product_images(url, is_primary), categories!inner(name, slug), reviews(rating)", { count: "exact" })
        .eq("is_active", true);

      if (q) query = query.ilike("name", `%${q}%`);
      if (categoria) query = query.eq("categories.slug", categoria);

      if (sort === "menor-preco") query = query.order("price", { ascending: true });
      else if (sort === "maior-preco") query = query.order("price", { ascending: false });
      else query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

      const from = (page - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, count } = await query;
      setProducts((data as any) || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchProducts();
  }, [q, categoria, sort, page]);

  const getImage = (p: Product) => p.product_images?.find(i => i.is_primary)?.url || p.product_images?.[0]?.url || "/placeholder.svg";
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm font-body text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Início</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Produtos</span>
          {q && <span> — Resultados para "{q}"</span>}
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide mb-8">
          {q ? `Resultados para "${q}"` : categoria ? categories.find(c => c.slug === categoria)?.name || "Produtos" : "Todos os Produtos"}
        </h1>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <Button variant={!categoria ? "default" : "outline"} size="sm" className="font-display uppercase tracking-wider text-xs" onClick={() => updateParam("categoria", "")}>
              Todos
            </Button>
            {categories.map(c => (
              <Button key={c.slug} variant={categoria === c.slug ? "default" : "outline"} size="sm" className="font-display uppercase tracking-wider text-xs" onClick={() => updateParam("categoria", c.slug)}>
                {c.name}
              </Button>
            ))}
          </div>

          <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
            <SelectTrigger className="w-48 font-body text-sm">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevancia">Relevância</SelectItem>
              <SelectItem value="menor-preco">Menor Preço</SelectItem>
              <SelectItem value="maior-preco">Maior Preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-80" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Nenhum produto encontrado</h2>
            <p className="text-muted-foreground font-body">Tente ajustar os filtros ou termos de busca.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground font-body mb-4">{total} produto(s) encontrado(s)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="group bg-card rounded-xl border border-border shadow-eco hover:shadow-eco-hover transition-all overflow-hidden">
                  <Link to={`/produto/${product.slug}`} className="relative aspect-square bg-muted overflow-hidden block">
                    <img src={getImage(product)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {product.is_new && (
                      <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-display uppercase tracking-wider px-3 py-1 rounded-full">Novo</span>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded font-display uppercase text-sm">Esgotado</span>
                      </div>
                    )}
                  </Link>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">{product.categories?.name}</p>
                    <Link to={`/produto/${product.slug}`}>
                      <h3 className="font-display text-sm font-semibold text-foreground leading-tight mb-2 line-clamp-2 hover:text-primary">{product.name}</h3>
                    </Link>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="font-display text-xl font-bold text-primary">R$ {product.price.toFixed(2).replace(".", ",")}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-xs text-muted-foreground line-through font-body">R$ {product.original_price.toFixed(2).replace(".", ",")}</span>
                      )}
                    </div>
                    <Button
                      className="w-full font-display uppercase tracking-wider text-xs"
                      size="sm"
                      disabled={product.stock === 0}
                      onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: getImage(product), slug: product.slug })}
                    >
                      <ShoppingCart className="mr-2 h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => updateParam("page", String(page - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => updateParam("page", String(p))}>
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => updateParam("page", String(page + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <StoreFooter />
    </div>
  );
};

export default CatalogPage;
