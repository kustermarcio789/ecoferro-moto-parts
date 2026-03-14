import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Wrench, Cog, Gauge, Disc3, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, any> = {
  sliders: Shield,
  protetores: Shield,
  suportes: Wrench,
  motor: Cog,
  freios: Disc3,
  suspensao: Wrench,
  eletrica: Gauge,
  escape: Zap,
};

const defaultCategories = [
  { name: "Sliders", slug: "sliders", icon: Shield },
  { name: "Protetores", slug: "protetores", icon: Shield },
  { name: "Suportes", slug: "suportes", icon: Wrench },
  { name: "Motor", slug: "motor", icon: Cog },
  { name: "Escape", slug: "escape", icon: Zap },
  { name: "Acessórios", slug: "acessorios", icon: Gauge },
];

const CategoriesSection = () => {
  const [categories, setCategories] = useState(defaultCategories);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, slug, image_url")
        .eq("is_active", true)
        .order("sort_order");
      if (data && data.length > 0) {
        setCategories(data.map(c => ({
          name: c.name,
          slug: c.slug,
          icon: iconMap[c.slug] || Cog,
        })));
      }
    };
    fetchCategories();
  }, []);

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            Categorias
          </h2>
          <p className="mt-3 text-muted-foreground font-body text-lg">
            Encontre a peça certa para sua moto
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Link
                to={`/produtos?categoria=${cat.slug}`}
                className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border shadow-eco hover:shadow-eco-hover hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <cat.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="font-display text-sm uppercase tracking-wider text-foreground font-medium text-center">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
