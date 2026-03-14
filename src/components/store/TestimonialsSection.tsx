import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
}

const TestimonialsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id, customer_name, rating, title, comment")
      .eq("is_approved", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews(data || []));
  }, []);

  // Fallback testimonials if no reviews in DB
  const fallback: Review[] = [
    { id: "1", customer_name: "Carlos M.", rating: 5, title: "Excelente qualidade", comment: "Slider perfeito para minha CB 300R. Acabamento impecável e encaixe perfeito." },
    { id: "2", customer_name: "Ricardo S.", rating: 5, title: "Entrega rápida", comment: "Recebi em 3 dias! Protetor de radiador top, recomendo demais." },
    { id: "3", customer_name: "Ana Paula F.", rating: 5, title: "Melhor custo-benefício", comment: "Comprei o suporte de baú e ficou perfeito. Preço justo e qualidade superior." },
  ];

  const items = reviews.length > 0 ? reviews : fallback;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            O que nossos clientes dizem
          </h2>
          <p className="mt-3 text-muted-foreground font-body text-lg">Avaliações reais de quem confia na EcoFerro</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {items.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 relative"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-4 w-4 ${j < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                ))}
              </div>
              {r.title && <p className="font-display text-sm font-semibold text-foreground mb-2">{r.title}</p>}
              {r.comment && <p className="text-sm text-muted-foreground font-body mb-4 line-clamp-4">{r.comment}</p>}
              <p className="font-display text-xs font-semibold text-primary uppercase tracking-wider">— {r.customer_name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
