import { motion } from "framer-motion";
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const products = [
  {
    id: 1,
    name: "Kit Relação CG 150 Titan",
    category: "Transmissão",
    price: 89.90,
    originalPrice: 119.90,
    rating: 4.8,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: "Mais Vendido",
  },
  {
    id: 2,
    name: "Pastilha de Freio Dianteira CB 300",
    category: "Freios",
    price: 34.90,
    originalPrice: null,
    rating: 4.6,
    reviews: 189,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: null,
  },
  {
    id: 3,
    name: "Jogo de Juntas Motor YBR 125",
    category: "Motor",
    price: 45.90,
    originalPrice: 59.90,
    rating: 4.7,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: "Promoção",
  },
  {
    id: 4,
    name: "Cabo de Acelerador CG 160",
    category: "Motor",
    price: 22.90,
    originalPrice: null,
    rating: 4.5,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: null,
  },
  {
    id: 5,
    name: "Kit Pistão + Anéis Fan 125",
    category: "Motor",
    price: 67.90,
    originalPrice: 89.90,
    rating: 4.9,
    reviews: 312,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: "Mais Vendido",
  },
  {
    id: 6,
    name: "Disco de Freio Dianteiro Fazer 250",
    category: "Freios",
    price: 79.90,
    originalPrice: 99.90,
    rating: 4.7,
    reviews: 145,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: "Promoção",
  },
  {
    id: 7,
    name: "Corrente de Transmissão 428H",
    category: "Transmissão",
    price: 49.90,
    originalPrice: null,
    rating: 4.4,
    reviews: 87,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: null,
  },
  {
    id: 8,
    name: "Retentor de Bengala NXR Bros",
    category: "Suspensão",
    price: 29.90,
    originalPrice: 39.90,
    rating: 4.6,
    reviews: 203,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
    badge: null,
  },
];

const Products = () => {
  return (
    <section id="produtos" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            Produtos em Destaque
          </h2>
          <p className="mt-3 text-muted-foreground font-body text-lg">
            As peças mais procuradas pelos nossos clientes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group bg-card rounded-xl border border-border shadow-eco hover:shadow-eco-hover transition-all overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-square bg-muted overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-eco-charcoal/80 to-eco-charcoal/40 flex items-center justify-center">
                  <Cog className="h-16 w-16 text-primary/30" />
                </div>
                {product.badge && (
                  <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-display uppercase tracking-wider px-3 py-1 rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">
                  {product.category}
                </p>
                <h3 className="font-display text-base font-semibold text-foreground leading-tight mb-2 line-clamp-2">
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-body text-foreground font-medium">{product.rating}</span>
                  <span className="text-xs text-muted-foreground">({product.reviews})</span>
                </div>

                {/* Price */}
                <div className="flex items-end gap-2 mb-4">
                  <span className="font-display text-2xl font-bold text-primary">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through font-body">
                      R$ {product.originalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>

                <Button className="w-full font-display uppercase tracking-wider text-sm">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            className="font-display uppercase tracking-wider"
          >
            Ver Todos os Produtos
          </Button>
        </div>
      </div>
    </section>
  );
};

// Need Cog for placeholder
import { Cog } from "lucide-react";

export default Products;
