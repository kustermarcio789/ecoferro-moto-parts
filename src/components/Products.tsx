import { motion } from "framer-motion";
import { ShoppingCart, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

import imgSuporteBau from "@/assets/products/suporte-bau-lander.jpg";
import imgSliderEscapamento from "@/assets/products/slider-escapamento-cb300f.jpg";
import imgSliderMt07 from "@/assets/products/slider-mt07.jpg";
import imgProtetorRadiador from "@/assets/products/protetor-radiador-cb650r.jpg";
import imgSliderCb300r from "@/assets/products/slider-cb300r.jpg";

const products = [
  {
    id: 1,
    name: "Suporte Baú Yamaha Lander 250 2023-2026",
    category: "Suportes",
    price: 189.90,
    originalPrice: null,
    rating: 4.8,
    reviews: 156,
    image: imgSuporteBau,
    badge: "Novo",
    mlLink: "https://www.mercadolivre.com.br/suporte-bau-yamaha-lander-250-2023-2024-2025-2026/up/MLBU3334593739",
  },
  {
    id: 2,
    name: "Slider Escapamento Honda CB300F / Twister 2023-2026",
    category: "Sliders",
    price: 119.90,
    originalPrice: null,
    rating: 4.7,
    reviews: 98,
    image: imgSliderEscapamento,
    badge: null,
    mlLink: "https://www.mercadolivre.com.br/slider-escapamento-honda-cb300f-cb-300f-twister-2023-a-2026/up/MLBU1731330288",
  },
  {
    id: 3,
    name: "Slider Protetor Yamaha MT-07 2016-2026",
    category: "Sliders",
    price: 149.90,
    originalPrice: null,
    rating: 4.9,
    reviews: 234,
    image: imgSliderMt07,
    badge: "Mais Vendido",
    mlLink: "https://www.mercadolivre.com.br/slider-protetor-yamaha-mt07-mt07-2016-a-2026/up/MLBU3452822748",
  },
  {
    id: 4,
    name: "Protetor de Radiador CB 650R CB650R",
    category: "Protetores",
    price: 135.85,
    originalPrice: 143.00,
    rating: 4.7,
    reviews: 131,
    image: imgProtetorRadiador,
    badge: "5% OFF",
    mlLink: "https://produto.mercadolivre.com.br/MLB-1613226532-protetor-de-radiador-cb-650r-cb650r-_JM",
  },
  {
    id: 5,
    name: "Slider Protetor Carenagem e Motor Honda CB300R",
    category: "Sliders",
    price: 139.90,
    originalPrice: null,
    rating: 4.6,
    reviews: 187,
    image: imgSliderCb300r,
    badge: null,
    mlLink: "https://www.mercadolivre.com.br/slider-protetor-carenagem-e-motor-honda-cb300r-cb-300r/up/MLBU3048179729",
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
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

                <Button className="w-full font-display uppercase tracking-wider text-sm" asChild>
                  <a href={product.mlLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Comprar no Mercado Livre
                  </a>
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
            asChild
          >
            <a
              href="https://lista.mercadolivre.com.br/pagina/ecoferro2059/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver Todos os Produtos no Mercado Livre
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Products;
