import { motion } from "framer-motion";
import { ArrowRight, Shield, Truck, Award, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.png";

const HeroBanner = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/produtos?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-eco-gradient" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-primary-foreground/70 font-display uppercase tracking-[0.3em] text-sm mb-4"
          >
            Peças e Acessórios para Motos
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold text-primary-foreground leading-[1.1] mb-6"
          >
            Qualidade e<br />
            <span className="text-eco-warm">Proteção</span><br />
            para sua Moto
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-primary-foreground/80 font-body text-lg mb-8 max-w-lg"
          >
            Sliders, protetores, suportes e muito mais. Peças fabricadas com precisão para proteger sua moto.
          </motion.p>

          {/* Search bar */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex gap-2 max-w-lg mb-8"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por peça, marca ou modelo..."
                className="w-full rounded-lg px-4 py-3 pr-10 font-body text-sm bg-primary-foreground/95 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button type="submit" className="bg-eco-warm text-eco-charcoal hover:bg-eco-warm/90 font-display uppercase tracking-wider px-6">
              Buscar
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Button
              size="lg"
              className="bg-eco-warm text-eco-charcoal hover:bg-eco-warm/90 font-display uppercase tracking-wider text-base px-8"
              asChild
            >
              <Link to="/produtos">
                Ver Produtos <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-display uppercase tracking-wider text-base"
              asChild
            >
              <Link to="/orcamento">Solicitar Orçamento</Link>
            </Button>
          </motion.div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl"
        >
          {[
            { icon: Shield, title: "Garantia de Qualidade", desc: "Peças com garantia de fábrica" },
            { icon: Truck, title: "Envio Rápido", desc: "Para todo o Brasil" },
            { icon: Award, title: "Melhor Custo-Benefício", desc: "+5.000 clientes satisfeitos" },
          ].map((badge) => (
            <div key={badge.title} className="flex items-center gap-3 text-primary-foreground/90">
              <badge.icon className="h-8 w-8 shrink-0 text-eco-warm" />
              <div>
                <p className="font-display text-sm font-semibold uppercase tracking-wider">{badge.title}</p>
                <p className="text-xs text-primary-foreground/60 font-body">{badge.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;
