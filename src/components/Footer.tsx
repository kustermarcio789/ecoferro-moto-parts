import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import logo from "@/assets/ecoferro-logo.jpeg";

const Footer = () => {
  return (
    <footer id="contato" className="bg-eco-charcoal text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <img src={logo} alt="EcoFerro" className="h-10 mb-4 brightness-0 invert" />
            <p className="text-sm text-primary-foreground/60 font-body leading-relaxed">
              Peças para motos com qualidade e os melhores preços do mercado.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">
              Navegação
            </h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/60">
              {["Início", "Categorias", "Produtos", "Sobre"].map((l) => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} className="hover:text-primary-foreground transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">
              Categorias
            </h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/60">
              {["Motor", "Freios", "Transmissão", "Suspensão", "Elétrica", "Escape"].map((c) => (
                <li key={c}>
                  <a href="#produtos" className="hover:text-primary-foreground transition-colors">
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display uppercase tracking-wider text-sm font-semibold mb-4">
              Contato
            </h4>
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

export default Footer;
