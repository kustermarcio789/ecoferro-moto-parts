import { motion } from "framer-motion";
import { Factory, Users, Package, MapPin } from "lucide-react";

const stats = [
  { icon: Factory, value: "10+", label: "Anos de Experiência" },
  { icon: Users, value: "5.000+", label: "Clientes Satisfeitos" },
  { icon: Package, value: "500+", label: "Produtos no Catálogo" },
  { icon: MapPin, value: "27", label: "Estados Atendidos" },
];

const TrustSection = () => (
  <section className="py-16 bg-primary">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="text-center text-primary-foreground"
          >
            <s.icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
            <p className="font-display text-3xl md:text-4xl font-bold">{s.value}</p>
            <p className="text-xs font-body uppercase tracking-wider opacity-70 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
