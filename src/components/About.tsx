import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import ecoIcon from "@/assets/ecoferro-icon.jpeg";

const features = [
  "Fabricação própria de peças e acessórios",
  "Atendimento especializado em motocicletas",
  "Envio rápido para todo o Brasil",
  "Garantia em todos os produtos",
  "Preços competitivos direto da fábrica",
  "Mais de 14 anos no mercado",
];

const About = () => {
  return (
    <section id="sobre" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto bg-primary/5 rounded-2xl flex items-center justify-center p-12 border border-border">
              <img src={ecoIcon} alt="EcoFerro" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div className="absolute -bottom-6 -right-2 md:right-4 bg-primary text-primary-foreground rounded-xl p-5 shadow-lg">
              <p className="font-display text-3xl font-bold">Desde 2010</p>
              <p className="text-sm text-primary-foreground/80 font-body">No mercado de motopeças</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide mb-6">
              Sobre a <span className="text-gradient-eco">EcoFerro</span>
            </h2>
            <p className="text-muted-foreground font-body text-lg mb-4 leading-relaxed">
              A Ecoferro Ltda, fundada em 15 de outubro de 2010, é especializada na fabricação de peças e acessórios para motocicletas. Localizada em Ourinhos, interior de São Paulo, atuamos na indústria da transformação com foco em qualidade, durabilidade e inovação.
            </p>
            <p className="text-muted-foreground font-body text-lg mb-8 leading-relaxed">
              Nosso compromisso é oferecer os melhores produtos diretamente da fábrica, garantindo o melhor custo-benefício para nossos clientes — do varejo ao atacado.
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

            <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border font-body text-sm text-muted-foreground">
              <p><strong className="text-foreground">Razão Social:</strong> Ecoferro Ltda</p>
              <p><strong className="text-foreground">CNPJ:</strong> 12.671.507/0001-56</p>
              <p><strong className="text-foreground">Atividade:</strong> Fabricação de peças e acessórios para motocicletas (CNAE C-3091-1/02)</p>
              <p><strong className="text-foreground">Endereço:</strong> R. Dário Alonso, 130 — Pq. Minas Gerais, Ourinhos - SP, 19902-030</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
