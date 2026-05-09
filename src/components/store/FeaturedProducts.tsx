import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  is_featured: boolean;
  product_images: { url: string; is_primary: boolean }[];
  categories: { name: string } | null;
  reviews: { rating: number }[];
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, stock, is_new, is_featured, product_images(url, is_primary), categories(name), reviews(rating)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .eq("wholesale_only", false)
        .gt("available_stock", 0)
        .order("created_at", { ascending: false })
        .limit(6);
      setProducts((data as any) || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const getImage = (p: Product) => {
    const primary = p.product_images?.find(i => i.is_primary);
    return primary?.url || p.product_images?.[0]?.url || "/placeholder.svg";
  };

  const getAvgRating = (p: Product) => {
    if (!p.reviews?.length) return 0;
    return p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;
  };

  const getBadge = (p: Product) => {
    if (p.is_new) return "Novo";
    if (p.original_price && p.original_price > p.price) {
      const pct = Math.round((1 - p.price / p.original_price) * 100);
      return `${pct}% OFF`;
    }
    return null;
  };

  if (loading) {
    return (
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-muted rounded mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {[1,2,3].map(i => <div key={i} className="h-80 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            Produtos em Destaque
          </h2>
          <p className="mt-4 text-muted-foreground font-body text-lg">
            Em breve nossos produtos estarão disponíveis aqui. Cadastre produtos pelo painel administrativo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            Produtos em Destaque
          </h2>
          <p className="mt-3 text-muted-foreground font-body text-lg">As peças mais procuradas pelos nossos clientes</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {products.map((product, i) => {
            const badge = getBadge(product);
            const rating = getAvgRating(product);
            const image = getImage(product);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group bg-card rounded-xl border border-border shadow-eco hover:shadow-eco-hover transition-all overflow-hidden"
              >
                <Link to={`/produto/${product.slug}`} className="relative aspect-square bg-muted overflow-hidden block">
                  <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {badge && (
                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-display uppercase tracking-wider px-3 py-1 rounded-full">
                      {badge}
                    </span>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-destructive text-destructive-foreground px-4 py-2 rounded font-display uppercase tracking-wider text-sm">Esgotado</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="rounded-full" asChild>
                      <Link to={`/produto/${product.slug}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </Link>

                <div className="p-4">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">
                    {product.categories?.name || "Peças"}
                  </p>
                  <Link to={`/produto/${product.slug}`}>
                    <h3 className="font-display text-base font-semibold text-foreground leading-tight mb-2 line-clamp-2 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {rating > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-body text-foreground font-medium">{rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="flex items-end gap-2 mb-4">
                    <span className="font-display text-2xl font-bold text-primary">
                      R$ {product.price.toFixed(2).replace(".", ",")}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-muted-foreground line-through font-body">
                        R$ {product.original_price.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>

                  <Button
                    className="w-full font-display uppercase tracking-wider text-sm"
                    disabled={product.stock === 0}
                    onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image, slug: product.slug })}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.stock === 0 ? "Esgotado" : "Adicionar ao Carrinho"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="font-display uppercase tracking-wider" asChild>
            <Link to="/produtos">Ver Todos os Produtos</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
