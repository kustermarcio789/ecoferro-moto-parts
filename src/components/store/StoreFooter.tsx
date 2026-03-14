import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import logo from "@/assets/ecoferro-logo.jpeg";

const StoreFooter = () => {
  return (
    <footer className="bg-eco-charcoal text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <img src={logo} alt="EcoFerro" className="h-10 mb-4 brightness-0 invert" />
            <p className="text-sm text-primary-foreground/60 font-body leading-relaxed">
              Peças e acessórios para motos com qualidade, durabilidade e os melhores preços do mercado.
            </p>
          </div>

          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">Institucional</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/60">
              {[
                { label: "Sobre Nós", href: "/sobre" },
                { label: "Contato", href: "/contato" },
                { label: "Política de Trocas", href: "/politica-trocas" },
                { label: "Política de Envio", href: "/politica-envio" },
                { label: "Termos de Uso", href: "/termos" },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="hover:text-primary-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">Navegação</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/60">
              {[
                { label: "Todos os Produtos", href: "/produtos" },
                { label: "Orçamento B2B", href: "/orcamento" },
                { label: "FAQ", href: "/faq" },
                { label: "Política de Privacidade", href: "/politica-privacidade" },
                { label: "Política de Cookies", href: "/politica-cookies" },
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
                (11) 99999-9999
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                contato@ecoferro.com.br
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                São Paulo, SP - Brasil
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="#" className="h-9 w-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center text-xs text-primary-foreground/40 font-body">
          © {new Date().getFullYear()} EcoFerro. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter;
