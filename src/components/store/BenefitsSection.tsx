import { motion } from "framer-motion";
import { Shield, Truck, CreditCard, Headphones, Award, RefreshCcw } from "lucide-react";

const benefits = [
  { icon: Shield, title: "Qualidade Garantida", desc: "Peças fabricadas com materiais de alta resistência" },
  { icon: Truck, title: "Envio para Todo Brasil", desc: "Entrega rápida e segura em todo território nacional" },
  { icon: CreditCard, title: "Parcelamento", desc: "Em até 12x sem juros no cartão de crédito" },
  { icon: Headphones, title: "Suporte Especializado", desc: "Atendimento técnico para tirar suas dúvidas" },
  { icon: Award, title: "Melhor Preço", desc: "Garantia do melhor custo-benefício do mercado" },
  { icon: RefreshCcw, title: "Troca Facilitada", desc: "Política de trocas simples e sem burocracia" },
];

const BenefitsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">
            Por que escolher a EcoFerro?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground uppercase tracking-wider mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
