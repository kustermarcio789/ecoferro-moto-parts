import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ShoppingCart, ChevronLeft, ChevronRight, SlidersHorizontal, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: string; name: string; slug: string; price: number; original_price: number | null;
  stock: number; available_stock?: number; is_new: boolean; sku: string | null; brand_id: string | null;
  product_images: { url: string; is_primary: boolean }[];
  categories: { id: string; name: string; slug: string; parent_id: string | null } | null;
  brands: { name: string; slug: string } | null;
}

interface Category { id: string; name: string; slug: string; parent_id: string | null; children?: Category[] }
interface Brand { id: string; name: string; slug: string; logo_url: string | null }

const ITEMS_PER_PAGE = 12;

const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { addItem } = useCart();

  const q = searchParams.get("q") || "";
  const marca = searchParams.get("marca") || "";
  const classe = searchParams.get("classe") || "";
  const subclasse = searchParams.get("subclasse") || "";
  const disponivel = searchParams.get("disponivel") || "";
  const precoMin = searchParams.get("preco_min") || "";
  const precoMax = searchParams.get("preco_max") || "";
  const sort = searchParams.get("sort") || "relevancia";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    Promise.all([
      supabase.from("categories").select("id, name, slug, parent_id").eq("is_active", true).order("sort_order"),
      supabase.from("brands").select("id, name, slug, logo_url").eq("is_active", true).order("name"),
    ]).then(([c, b]) => {
      const all = c.data || [];
      setAllCategories(all);
      setBrands(b.data || []);
      setClasses(all.filter(cat => !cat.parent_id).map(p => ({
        ...p, children: all.filter(ch => ch.parent_id === p.id),
      })));
    });
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      console.log("Fetching products with filters:", { q, marca, classe, subclasse, disponivel, precoMin, precoMax });
      
      let query = supabase
        .from("products")
        .select("id, name, slug, price, original_price, stock, available_stock, is_new, sku, brand_id, product_images(url, is_primary), categories(id, name, slug, parent_id), brands(name, slug)", { count: "exact" })
        .eq("is_active", true)
        .eq("wholesale_only", false);

      // Relaxed stock check: if sync hasn't populated available_stock yet, allow products with legacy 'stock' > 0
      // or simply show all active products if the user explicitly didn't filter by availability
      if (disponivel === "sim") {
        query = query.or("available_stock.gt.0,stock.gt.0");
      }

      if (q) query = query.ilike("name", `%${q}%`);
      if (marca) {
        const brandObj = brands.find(b => b.slug === marca);
        if (brandObj) query = query.eq("brand_id", brandObj.id);
      }
      if (precoMin) query = query.gte("price", Number(precoMin));
      if (precoMax) query = query.lte("price", Number(precoMax));

      if (subclasse) {
        const subCat = allCategories.find(c => c.slug === subclasse);
        if (subCat) query = query.eq("category_id", subCat.id);
      } else if (classe) {
        const classeCat = allCategories.find(c => c.slug === classe && !c.parent_id);
        if (classeCat) {
          const subIds = allCategories.filter(c => c.parent_id === classeCat.id).map(c => c.id);
          subIds.push(classeCat.id);
          query = query.in("category_id", subIds);
        }
      }

      if (sort === "menor-preco") query = query.order("price", { ascending: true });
      else if (sort === "maior-preco") query = query.order("price", { ascending: false });
      else if (sort === "lancamentos") query = query.order("created_at", { ascending: false });
      else query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

      const from = (page - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, count, error } = await query;
      
      if (error) {
        console.error("Error fetching products:", error);
      }

      console.log(`Fetched ${data?.length || 0} products. Total count: ${count}`);
      
      setProducts((data as any) || []);
      setTotal(count || 0);
      setLoading(false);
    };
    if ((allCategories.length > 0 && brands.length > 0) || (!classe && !subclasse && !marca)) fetchProducts();
  }, [q, marca, classe, subclasse, disponivel, precoMin, precoMax, sort, page, allCategories, brands]);

  const getImage = (p: Product) => p.product_images?.find(i => i.is_primary)?.url || p.product_images?.[0]?.url || "/placeholder.svg";
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    if (key !== "page") params.delete("page");
    setSearchParams(params);
  };

  const clearFilters = () => setSearchParams({});
  const hasFilters = marca || classe || subclasse || disponivel || precoMin || precoMax || q;

  // Build breadcrumb
  const breadcrumbs: { label: string; href?: string }[] = [{ label: "Início", href: "/" }, { label: "Produtos", href: "/produtos" }];
  if (marca) breadcrumbs.push({ label: brands.find(b => b.slug === marca)?.name || marca });
  if (classe) breadcrumbs.push({ label: classes.find(c => c.slug === classe)?.name || classe });
  if (subclasse) {
    const sub = allCategories.find(c => c.slug === subclasse);
    if (sub) {
      const parent = classes.find(c => c.id === sub.parent_id);
      if (parent) breadcrumbs.push({ label: parent.name, href: `/produtos?classe=${parent.slug}` });
      breadcrumbs.push({ label: sub.name });
    }
  }

  // Title
  const pageTitle = q ? `Resultados para "${q}"`
    : subclasse ? allCategories.find(c => c.slug === subclasse)?.name || "Produtos"
    : classe ? classes.find(c => c.slug === classe)?.name || "Produtos"
    : marca ? brands.find(b => b.slug === marca)?.name || "Produtos"
    : "Todos os Produtos";

  // Selected class for subclass display
  const selectedClass = classe ? classes.find(c => c.slug === classe) : null;

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm font-body text-muted-foreground mb-6 flex items-center gap-1 flex-wrap">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1">/</span>}
              {b.href ? <Link to={b.href} className="hover:text-primary">{b.label}</Link> : <span className="text-foreground">{b.label}</span>}
            </span>
          ))}
        </nav>

        <div className="flex items-start justify-between mb-6">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground uppercase tracking-wide">{pageTitle}</h1>
          <Button variant="outline" size="sm" className="md:hidden font-display uppercase tracking-wider text-xs" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Filtros
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className={`${showFilters ? "block fixed inset-0 z-50 bg-card p-6 overflow-y-auto" : "hidden"} md:block md:relative md:w-64 shrink-0`}>
            {showFilters && (
              <div className="flex items-center justify-between mb-4 md:hidden">
                <h3 className="font-display text-lg font-bold uppercase tracking-wider">Filtros</h3>
                <button onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></button>
              </div>
            )}

            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="text-xs font-display font-bold uppercase tracking-wider text-foreground mb-2 block">Buscar</label>
                <input type="text" value={q} onChange={e => updateParam("q", e.target.value)} placeholder="Nome, SKU..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              {/* Brands */}
              <div>
                <label className="text-xs font-display font-bold uppercase tracking-wider text-foreground mb-2 block">Marca</label>
                <div className="space-y-1">
                  {brands.map(b => (
                    <button key={b.slug} onClick={() => updateParam("marca", marca === b.slug ? "" : b.slug)}
                      className={`flex items-center gap-2.5 w-full text-left px-3 py-1.5 rounded-md font-body text-sm transition-colors ${marca === b.slug ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted"}`}>
                      {b.logo_url && <img src={b.logo_url} alt={b.name} className="object-contain shrink-0" style={{ height: '34px', width: '34px' }} />}
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Classes */}
              <div>
                <label className="text-xs font-display font-bold uppercase tracking-wider text-foreground mb-2 block">Classe</label>
                <div className="space-y-1">
                  {classes.map(c => (
                    <button key={c.slug} onClick={() => { updateParam("classe", classe === c.slug ? "" : c.slug); if (subclasse) updateParam("subclasse", ""); }}
                      className={`block w-full text-left px-3 py-1.5 rounded-md font-body text-sm transition-colors ${classe === c.slug ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted"}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subclasses (when class selected) */}
              {selectedClass?.children && selectedClass.children.length > 0 && (
                <div>
                  <label className="text-xs font-display font-bold uppercase tracking-wider text-foreground mb-2 block">Subclasse</label>
                  <div className="space-y-1">
                    {selectedClass.children.map(sub => (
                      <button key={sub.slug} onClick={() => updateParam("subclasse", subclasse === sub.slug ? "" : sub.slug)}
                        className={`block w-full text-left px-3 py-1.5 rounded-md font-body text-sm transition-colors ${subclasse === sub.slug ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted"}`}>
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price range */}
              <div>
                <label className="text-xs font-display font-bold uppercase tracking-wider text-foreground mb-2 block">Faixa de Preço</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Mín" value={precoMin} onChange={e => updateParam("preco_min", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input type="number" placeholder="Máx" value={precoMax} onChange={e => updateParam("preco_max", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                  <input type="checkbox" checked={disponivel === "sim"} onChange={e => updateParam("disponivel", e.target.checked ? "sim" : "")} className="rounded border-border" />
                  Apenas em estoque
                </label>
              </div>

              {hasFilters && (
                <Button variant="outline" size="sm" className="w-full font-display uppercase tracking-wider text-xs" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </div>

            {showFilters && (
              <Button className="w-full mt-6 font-display uppercase tracking-wider md:hidden" onClick={() => setShowFilters(false)}>
                Ver {total} produto(s)
              </Button>
            )}
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {/* Active filters & sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="text-sm text-muted-foreground font-body">{total} produto(s)</p>
                {marca && <Badge variant="secondary" className="gap-1">{brands.find(b => b.slug === marca)?.name} <button onClick={() => updateParam("marca", "")}><X className="h-3 w-3" /></button></Badge>}
                {classe && <Badge variant="secondary" className="gap-1">{classes.find(c => c.slug === classe)?.name} <button onClick={() => updateParam("classe", "")}><X className="h-3 w-3" /></button></Badge>}
                {subclasse && <Badge variant="secondary" className="gap-1">{allCategories.find(c => c.slug === subclasse)?.name} <button onClick={() => updateParam("subclasse", "")}><X className="h-3 w-3" /></button></Badge>}
              </div>
              <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
                <SelectTrigger className="w-48 font-body text-sm"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevancia">Relevância</SelectItem>
                  <SelectItem value="menor-preco">Menor Preço</SelectItem>
                  <SelectItem value="maior-preco">Maior Preço</SelectItem>
                  <SelectItem value="lancamentos">Lançamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse bg-muted rounded-xl h-80" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">Nenhum produto encontrado</h2>
                <p className="text-muted-foreground font-body mb-4">Tente ajustar os filtros ou termos de busca.</p>
                {hasFilters && <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="group bg-card rounded-xl border border-border shadow-eco hover:shadow-eco-hover transition-all overflow-hidden">
                      <div className="relative aspect-square bg-white overflow-hidden block">
                        <Link to={`/produto/${product.slug}`} className="block w-full h-full">
                          <img src={getImage(product)} alt={product.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                        </Link>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxImage(getImage(product)); }}
                          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                          title="Ampliar imagem"
                        >
                          <ZoomIn className="h-4 w-4 text-white" />
                        </button>
                        {product.is_new && (
                          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-display uppercase tracking-wider px-3 py-1 rounded-full">Novo</span>
                        )}
                        {product.original_price && product.original_price > product.price && (
                          <span className="absolute bottom-3 right-3 bg-destructive text-destructive-foreground text-xs font-display uppercase tracking-wider px-2 py-1 rounded-full">
                            -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                          </span>
                        )}
                        {(product.stock === 0 && (product.available_stock === undefined || product.available_stock === 0)) && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded font-display uppercase text-sm">Esgotado</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          {product.brands?.name && <span className="text-[10px] text-primary font-display uppercase tracking-wider font-bold">{product.brands.name}</span>}
                          {product.categories?.name && <span className="text-[10px] text-muted-foreground font-body">• {product.categories.name}</span>}
                        </div>
                        <Link to={`/produto/${product.slug}`}>
                          <h3 className="font-display text-sm font-semibold text-foreground leading-tight mb-1 line-clamp-2 hover:text-primary transition-colors">{product.name}</h3>
                        </Link>
                        {product.sku && <p className="text-[10px] text-muted-foreground font-body mb-2">SKU: {product.sku}</p>}
                        <div className="flex items-end gap-2 mb-3">
                          <span className="font-display text-xl font-bold text-primary">R$ {product.price.toFixed(2).replace(".", ",")}</span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through font-body">R$ {product.original_price.toFixed(2).replace(".", ",")}</span>
                          )}
                        </div>
                        <Button className="w-full font-display uppercase tracking-wider text-xs" size="sm" disabled={product.stock === 0}
                          onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: getImage(product), slug: product.slug })}>
                          <ShoppingCart className="mr-2 h-3 w-3" /> Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => updateParam("page", String(page - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
                      <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => updateParam("page", String(p))}>{p}</Button>
                    ))}
                    <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => updateParam("page", String(page + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => { if (!open) setLightboxImage(null); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <button onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="h-6 w-6 text-white" />
            </button>
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Produto ampliado"
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              />
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>

      <StoreFooter />
    </div>
  );
};

export default CatalogPage;
