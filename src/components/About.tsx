import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import ecoIcon from "@/assets/ecoferro-icon.jpeg";

const features = [
  "Peças originais e de alta qualidade",
  "Atendimento especializado em motos",
  "Envio rápido para todo o Brasil",
  "Garantia em todos os produtos",
  "Preços competitivos do mercado",
  "Mais de 1.000 itens em estoque",
];

const About = () => {
  return (
    <section id="sobre" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto bg-primary/5 rounded-2xl flex items-center justify-center p-12 border border-border">
              <img
                src={ecoIcon}
                alt="EcoFerro"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            {/* Stats overlay */}
            <div className="absolute -bottom-6 -right-2 md:right-4 bg-primary text-primary-foreground rounded-xl p-5 shadow-lg">
              <p className="font-display text-3xl font-bold">5.000+</p>
              <p className="text-sm text-primary-foreground/80 font-body">Clientes satisfeitos</p>
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide mb-6">
              Sobre a <span className="text-gradient-eco">EcoFerro</span>
            </h2>
            <p className="text-muted-foreground font-body text-lg mb-8 leading-relaxed">
              A EcoFerro é referência em peças para motos, oferecendo as melhores marcas
              do mercado com preços acessíveis. Nosso compromisso é garantir qualidade,
              durabilidade e o melhor custo-benefício para nossos clientes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-body text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
