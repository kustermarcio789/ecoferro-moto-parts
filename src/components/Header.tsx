import { useState } from "react";
import { Search, ShoppingCart, Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/ecoferro-logo.jpeg";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: "Início", href: "#inicio" },
    { label: "Categorias", href: "#categorias" },
    { label: "Produtos", href: "#produtos" },
    { label: "Sobre", href: "#sobre" },
    { label: "Contato", href: "#contato" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      {/* Top bar */}
      <div className="bg-primary">
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between text-primary-foreground text-sm font-body">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>(11) 99999-9999</span>
          </div>
          <span className="hidden sm:block">Frete grátis para compras acima de R$ 299</span>
          <a
            href="https://lista.mercadolivre.com.br/pagina/ecoferro2059/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Mercado Livre
          </a>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <a href="#inicio" className="shrink-0">
          <img src={logo} alt="EcoFerro" className="h-10 md:h-12 object-contain" />
        </a>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-xl relative">
          <input
            type="text"
            placeholder="Buscar peças para motos..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              0
            </span>
          </Button>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:block border-t border-border">
        <div className="container mx-auto px-4 flex gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="py-3 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-card">
          <div className="p-4 space-y-1">
            {/* Mobile search */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Buscar peças..."
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
