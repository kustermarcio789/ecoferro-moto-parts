import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, MessageCircle, ChevronLeft, ChevronRight, Star, Truck, Shield, Tag, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogClose } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary, sort_order), categories(id, name, slug, parent_id), brands(name, slug), reviews(rating, customer_name, comment, title, created_at)")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (data) {
        setProduct(data);
        const imgs = (data.product_images || [])
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((i: any) => i.url);
        setImages(imgs.length > 0 ? imgs : ["/placeholder.svg"]);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse grid md:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted rounded-xl" />
            <div className="space-y-4"><div className="h-8 bg-muted rounded w-3/4" /><div className="h-6 bg-muted rounded w-1/2" /><div className="h-12 bg-muted rounded w-1/3" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Produto não encontrado</h1>
          <Button asChild><Link to="/produtos">Ver Produtos</Link></Button>
        </div>
        <StoreFooter />
      </div>
    );
  }

  const avgRating = product.reviews?.length
    ? (product.reviews.reduce((s: number, r: any) => s + r.rating, 0) / product.reviews.length).toFixed(1)
    : null;

  const whatsappUrl = `https://wa.me/551420340647?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name}`)}`;

  // Build breadcrumb
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Início", href: "/" },
    { label: "Produtos", href: "/produtos" },
  ];
  if (product.brands?.name) breadcrumbs.push({ label: product.brands.name, href: `/produtos?marca=${product.brands.slug}` });
  if (product.categories?.name) breadcrumbs.push({ label: product.categories.name, href: `/produtos?subclasse=${product.categories.slug}` });
  breadcrumbs.push({ label: product.name });

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm font-body text-muted-foreground mb-6 flex items-center gap-1 flex-wrap">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1">/</span>}
              {b.href ? <Link to={b.href} className="hover:text-primary">{b.label}</Link> : <span className="text-foreground line-clamp-1">{b.label}</span>}
            </span>
          ))}
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden mb-4 group cursor-pointer"
              onClick={() => setLightboxOpen(true)}>
              <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setActiveImage(i => i > 0 ? i - 1 : images.length - 1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center hover:bg-card z-10">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveImage(i => i < images.length - 1 ? i + 1 : 0); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center hover:bg-card z-10">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === activeImage ? "border-primary" : "border-border"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lightbox Modal */}
          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
                <button onClick={() => setLightboxOpen(false)}
                  className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <X className="h-6 w-6 text-white" />
                </button>
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImage(i => i > 0 ? i - 1 : images.length - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <ChevronLeft className="h-7 w-7 text-white" />
                    </button>
                    <button onClick={() => setActiveImage(i => i < images.length - 1 ? i + 1 : 0)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <ChevronRight className="h-7 w-7 text-white" />
                    </button>
                  </>
                )}
                <img
                  src={images[activeImage]}
                  alt={product.name}
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setActiveImage(i)}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${i === activeImage ? "bg-white" : "bg-white/40 hover:bg-white/60"}`} />
                    ))}
                  </div>
                )}
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </Dialog>

          {/* Product info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {product.brands?.name && (
                <Link to={`/produtos?marca=${product.brands.slug}`} className="text-xs text-primary font-display uppercase tracking-wider font-bold hover:underline">
                  {product.brands.name}
                </Link>
              )}
              {product.categories?.name && (
                <Link to={`/produtos?subclasse=${product.categories.slug}`} className="text-xs text-muted-foreground font-body hover:text-primary">
                  • {product.categories.name}
                </Link>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1 mb-3">{product.name}</h1>

            <div className="flex items-center gap-3 mb-4">
              {product.sku && <span className="text-xs text-muted-foreground font-body bg-muted px-2 py-1 rounded">SKU: {product.sku}</span>}
              {avgRating && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                  ))}
                  <span className="text-xs font-body text-muted-foreground ml-1">({product.reviews.length})</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              {product.original_price && product.original_price > product.price && (
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-muted-foreground line-through font-body">De R$ {Number(product.original_price).toFixed(2).replace(".", ",")}</p>
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-display">
                    -{Math.round(((Number(product.original_price) - Number(product.price)) / Number(product.original_price)) * 100)}%
                  </span>
                </div>
              )}
              <p className="font-display text-4xl font-bold text-primary">R$ {Number(product.price).toFixed(2).replace(".", ",")}</p>
              <p className="text-sm text-muted-foreground font-body mt-1">em até 12x de R$ {(Number(product.price) / 12).toFixed(2).replace(".", ",")}</p>
              <p className="text-sm text-primary font-body font-medium mt-1">R$ {(Number(product.price) * 0.95).toFixed(2).replace(".", ",")} no Pix (5% off)</p>
            </div>

            <p className={`text-sm font-body mb-4 ${product.stock > 0 ? "text-primary" : "text-destructive"}`}>
              {product.stock > 0 ? `✓ Em estoque (${product.stock} disponíveis)` : "✗ Produto esgotado"}
            </p>

            {product.stock > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-body text-foreground">Quantidade:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-muted">-</button>
                  <span className="px-4 py-2 font-body text-sm border-x border-border">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-3 py-2 hover:bg-muted">+</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button className="w-full font-display uppercase tracking-wider text-base py-6" size="lg" disabled={product.stock === 0}
                onClick={() => addItem({ id: product.id, name: product.name, price: Number(product.price), image: images[0], slug: product.slug, sku: product.sku }, quantity)}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Adicionar ao Carrinho
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="font-display uppercase tracking-wider text-xs" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
                </Button>
                <Button variant="outline" className="font-display uppercase tracking-wider text-xs" asChild>
                  <Link to="/orcamento"><Tag className="mr-2 h-4 w-4" /> Solicitar Orçamento</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {[
                { icon: Truck, text: "Envio rápido para todo o Brasil" },
                { icon: Shield, text: "Garantia de qualidade e procedência" },
              ].map(t => (
                <div key={t.text} className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                  <t.icon className="h-4 w-4 text-primary" /> {t.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide mb-4">Descrição</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground font-body">
              <p className="whitespace-pre-wrap">{product.description}</p>
            </div>
          </div>
        )}

        {/* Reviews */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide mb-6">Avaliações ({product.reviews.length})</h2>
            <div className="space-y-4 max-w-2xl">
              {product.reviews.map((r: any, i: number) => (
                <div key={i} className="p-4 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3.5 w-3.5 ${j < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-body font-medium text-foreground">{r.customer_name}</span>
                  </div>
                  {r.title && <p className="font-display text-sm font-semibold text-foreground mb-1">{r.title}</p>}
                  {r.comment && <p className="text-sm text-muted-foreground font-body">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <StoreFooter />
    </div>
  );
};

export default ProductPage;
