import { motion } from "framer-motion";
import { ArrowRight, Shield, Truck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section id="inicio" className="relative min-h-[80vh] flex items-center overflow-hidden">
      {/* Background */}
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
            Peças para motos
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold text-primary-foreground leading-[1.1] mb-6"
          >
            Qualidade e<br />
            <span className="text-eco-warm">Resistência</span><br />
            para sua Moto
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-primary-foreground/80 font-body text-lg mb-8 max-w-lg"
          >
            As melhores peças e acessórios para sua moto com preços imbatíveis.
            Entrega rápida para todo o Brasil.
          </motion.p>

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
              <a href="#produtos">
                Ver Produtos <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-display uppercase tracking-wider text-base"
              asChild
            >
              <a href="#categorias">Categorias</a>
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
            { icon: Shield, title: "Garantia de Qualidade", desc: "Peças com certificação" },
            { icon: Truck, title: "Envio Rápido", desc: "Para todo o Brasil" },
            { icon: Award, title: "Melhor Preço", desc: "Garantia do menor preço" },
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

export default Hero;
