import { motion } from "framer-motion";
import { Cog, Disc3, Link2, Gauge, Wrench, Zap } from "lucide-react";

const categories = [
  { icon: Cog, name: "Motor", count: 124 },
  { icon: Disc3, name: "Freios", count: 89 },
  { icon: Link2, name: "Transmissão", count: 67 },
  { icon: Gauge, name: "Painel / Elétrica", count: 93 },
  { icon: Wrench, name: "Suspensão", count: 56 },
  { icon: Zap, name: "Escape", count: 42 },
];

const Categories = () => {
  return (
    <section id="categorias" className="py-20 bg-background">
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
            <motion.a
              key={cat.name}
              href="#produtos"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border shadow-eco hover:shadow-eco-hover hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <cat.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="font-display text-sm uppercase tracking-wider text-foreground font-medium text-center">
                {cat.name}
              </span>
              <span className="text-xs text-muted-foreground font-body">
                {cat.count} produtos
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
