import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Wrench, Lightbulb, Package, Briefcase, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, any> = {
  "suportes-de-placa": Wrench,
  "protecao": Shield,
  "setas-e-adaptacoes": Settings,
  "eletrica-e-iluminacao": Lightbulb,
  "bagageiros-e-suportes": Briefcase,
  "acessorios": Package,
};

const CategoriesSection = () => {
  const [classes, setClasses] = useState<{ name: string; slug: string; description: string | null }[]>([]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("name, slug, description")
      .is("parent_id", null)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setClasses(data); });
  }, []);

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            Classes de Produtos
          </h2>
          <p className="mt-3 text-muted-foreground font-body text-lg">
            Encontre a peça certa para sua moto por classe
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {classes.map((cat, i) => {
            const Icon = iconMap[cat.slug] || Package;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  to={`/produtos?classe=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border shadow-eco hover:shadow-eco-hover hover:border-primary/30 transition-all cursor-pointer h-full"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="font-display text-sm uppercase tracking-wider text-foreground font-medium text-center">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
