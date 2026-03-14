import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Heart, MessageCircle, ChevronLeft, ChevronRight, Star, Truck, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const fetch = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary, sort_order), categories(name, slug), reviews(rating, customer_name, comment, title, created_at)")
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
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse grid md:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/2" />
              <div className="h-12 bg-muted rounded w-1/3" />
            </div>
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

  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name}`)}`;

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm font-body text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">Início</Link>
          <span>/</span>
          <Link to="/produtos" className="hover:text-primary">Produtos</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden mb-4">
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(i => i > 0 ? i - 1 : images.length - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center hover:bg-card"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => i < images.length - 1 ? i + 1 : 0)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center hover:bg-card"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === activeImage ? "border-primary" : "border-border"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            {product.categories?.name && (
              <Link to={`/produtos?categoria=${product.categories.slug}`} className="text-xs text-muted-foreground font-body uppercase tracking-wider hover:text-primary">
                {product.categories.name}
              </Link>
            )}
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1 mb-3">{product.name}</h1>

            {product.sku && <p className="text-xs text-muted-foreground font-body mb-2">SKU: {product.sku}</p>}

            {avgRating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                  ))}
                </div>
                <span className="text-sm font-body text-muted-foreground">({product.reviews.length} avaliações)</span>
              </div>
            )}

            {/* Price */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              {product.original_price && product.original_price > product.price && (
                <p className="text-sm text-muted-foreground line-through font-body">
                  De R$ {Number(product.original_price).toFixed(2).replace(".", ",")}
                </p>
              )}
              <p className="font-display text-4xl font-bold text-primary">
                R$ {Number(product.price).toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm text-muted-foreground font-body mt-1">
                em até 12x de R$ {(Number(product.price) / 12).toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm text-primary font-body font-medium mt-1">
                R$ {(Number(product.price) * 0.95).toFixed(2).replace(".", ",")} no Pix (5% off)
              </p>
            </div>

            {/* Stock */}
            <p className={`text-sm font-body mb-4 ${product.stock > 0 ? "text-primary" : "text-destructive"}`}>
              {product.stock > 0 ? `✓ Em estoque (${product.stock} disponíveis)` : "✗ Produto esgotado"}
            </p>

            {/* Quantity */}
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

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full font-display uppercase tracking-wider text-base py-6"
                size="lg"
                disabled={product.stock === 0}
                onClick={() => addItem({ id: product.id, name: product.name, price: Number(product.price), image: images[0], slug: product.slug, sku: product.sku }, quantity)}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Adicionar ao Carrinho
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="font-display uppercase tracking-wider text-xs" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" className="font-display uppercase tracking-wider text-xs" asChild>
                  <Link to="/orcamento">
                    Solicitar Orçamento
                  </Link>
                </Button>
              </div>

              {product.ml_permalink && (
                <Button variant="secondary" className="w-full font-display uppercase tracking-wider text-xs" asChild>
                  <a href={product.ml_permalink} target="_blank" rel="noopener noreferrer">
                    Comprar no Mercado Livre
                  </a>
                </Button>
              )}
            </div>

            {/* Trust */}
            <div className="mt-6 space-y-2">
              {[
                { icon: Truck, text: "Envio rápido para todo o Brasil" },
                { icon: Shield, text: "Garantia de qualidade e procedência" },
              ].map(t => (
                <div key={t.text} className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                  <t.icon className="h-4 w-4 text-primary" />
                  {t.text}
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
            <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide mb-6">
              Avaliações ({product.reviews.length})
            </h2>
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
