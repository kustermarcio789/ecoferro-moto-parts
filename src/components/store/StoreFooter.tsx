import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook, Clock } from "lucide-react";
import logo from "@/assets/ecoferro-logo.jpeg";

const StoreFooter = () => {
  return (
    <footer className="bg-eco-charcoal text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <img src={logo} alt="EcoFerro" className="h-10 mb-4 brightness-0 invert" />
            <p className="text-sm text-primary-foreground/60 font-body leading-relaxed mb-3">
              Fabricação de peças e acessórios para motocicletas com qualidade, durabilidade e os melhores preços do mercado.
            </p>
            <p className="text-xs text-primary-foreground/40 font-body">
              Ecoferro Ltda — CNPJ: 12.671.507/0001-56
            </p>
          </div>

          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">Institucional</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/60">
              {[
                { label: "Sobre Nós", href: "/sobre" },
                { label: "Contato", href: "/contato" },
                { label: "Atacado", href: "/atacado" },
                { label: "Orçamento B2B", href: "/orcamento" },
                { label: "Política de Trocas", href: "/politica-trocas" },
                { label: "Política de Envio", href: "/politica-envio" },
                { label: "Termos de Uso", href: "/termos" },
                { label: "Política de Privacidade", href: "/politica-privacidade" },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="hover:text-primary-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 font-body text-sm text-primary-foreground/60">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href="tel:+551420340647" className="hover:text-primary-foreground transition-colors">(14) 2034-0647</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href="mailto:vendas@ecoferro.com.br" className="hover:text-primary-foreground transition-colors">vendas@ecoferro.com.br</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>R. Dário Alonso, 130 — Parque Minas Gerais, Ourinhos - SP, 19902-030</span>
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="https://web.facebook.com/ecoferro/" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">Horário de Funcionamento</h4>
            <ul className="space-y-1.5 font-body text-sm text-primary-foreground/60">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="font-medium text-primary-foreground/80">Seg a Sex</span>
              </li>
              <li className="ml-6">08:00 – 17:30</li>
              <li className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="font-medium text-primary-foreground/80">Sáb e Dom</span>
              </li>
              <li className="ml-6">Fechado</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40 font-body">
          © {new Date().getFullYear()} EcoFerro Ltda. Todos os direitos reservados. CNPJ: 12.671.507/0001-56
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter;
