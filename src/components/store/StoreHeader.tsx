import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, X, Phone, User, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/ecoferro-logo.jpeg";

interface Brand { name: string; slug: string; logo_url: string | null }
interface Category { id: string; name: string; slug: string; parent_id: string | null; children?: Category[] }

const StoreHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [classes, setClasses] = useState<Category[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { totalItems, setIsOpen } = useCart();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("brands").select("name, slug, logo_url").eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name, slug, parent_id").eq("is_active", true).order("sort_order"),
    ]).then(([b, c]) => {
      setBrands(b.data || []);
      const all = c.data || [];
      const parents = all.filter(cat => !cat.parent_id).map(p => ({
        ...p,
        children: all.filter(ch => ch.parent_id === p.id),
      }));
      setClasses(parents);
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produtos?q=${encodeURIComponent(searchQuery.trim())}`);
      setMenuOpen(false);
      setSearchQuery("");
    }
  };

  const closeAll = () => { setMenuOpen(false); setOpenDropdown(null); };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      {/* Top bar */}
      <div className="bg-primary">
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between text-primary-foreground text-xs font-body">
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3" />
            <a href="tel:+551420340647" className="hover:underline">(14) 2034-0647</a>
          </div>
          <span className="hidden sm:block text-primary-foreground/80">Frete grátis para compras acima de R$ 299</span>
          <Link to="/login" className="hover:underline text-primary-foreground/70 flex items-center gap-1">
            <User className="h-3 w-3" /> Entrar
          </Link>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <img src={logo} alt="EcoFerro" className="h-10 md:h-12 object-contain" />
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por peça, marca, modelo..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Button>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:block border-t border-border" ref={dropdownRef}>
        <div className="container mx-auto px-4 flex items-stretch">
          <Link to="/" className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">
            Início
          </Link>
          <Link to="/produtos" className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">
            Produtos
          </Link>

          {/* Marcas dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "marcas" ? null : "marcas")}
              className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary flex items-center gap-1"
            >
              Marcas <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "marcas" && (
              <div className="absolute top-full left-0 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[200px] z-50">
                {brands.map(b => (
                  <Link key={b.slug} to={`/produtos?marca=${b.slug}`} onClick={closeAll}
                    className="flex items-center gap-2.5 px-4 py-2 font-body text-sm text-foreground/80 hover:text-primary hover:bg-muted transition-colors">
                    {b.logo_url && <img src={b.logo_url} alt={b.name} className="object-contain shrink-0" style={{ height: '34px', width: '34px' }} />}
                    {b.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Classes dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "classes" ? null : "classes")}
              className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary flex items-center gap-1"
            >
              Classes <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === "classes" && (
              <div className="absolute top-full left-0 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[280px] z-50">
                {classes.map(cls => (
                  <div key={cls.slug} className="group relative">
                    <Link to={`/produtos?classe=${cls.slug}`} onClick={closeAll}
                      className="flex items-center justify-between px-4 py-2 font-body text-sm text-foreground/80 hover:text-primary hover:bg-muted transition-colors">
                      {cls.name}
                      {cls.children && cls.children.length > 0 && <ChevronRight className="h-3 w-3" />}
                    </Link>
                    {cls.children && cls.children.length > 0 && (
                      <div className="hidden group-hover:block absolute left-full top-0 bg-card border border-border rounded-lg shadow-lg py-2 min-w-[240px]">
                        {cls.children.map(sub => (
                          <Link key={sub.slug} to={`/produtos?subclasse=${sub.slug}`} onClick={closeAll}
                            className="block px-4 py-2 font-body text-sm text-foreground/80 hover:text-primary hover:bg-muted transition-colors">
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/atacado" className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">
            Atacado
          </Link>
          <Link to="/orcamento" className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">
            Orçamento B2B
          </Link>
          <Link to="/contato" className="py-3 px-4 font-display text-sm uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary">
            Contato
          </Link>
        </div>
      </nav>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-card max-h-[80vh] overflow-y-auto">
          <div className="p-4 space-y-1">
            <form onSubmit={handleSearch} className="relative mb-3">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar peças..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2"><Search className="h-4 w-4 text-muted-foreground" /></button>
            </form>

            <Link to="/" onClick={closeAll} className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">Início</Link>
            <Link to="/produtos" onClick={closeAll} className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">Todos os Produtos</Link>

            {/* Mobile Marcas */}
            <button onClick={() => setOpenDropdown(openDropdown === "m-marcas" ? null : "m-marcas")}
              className="w-full flex items-center justify-between py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">
              Marcas <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "m-marcas" ? "rotate-180" : ""}`} />
            </button>
            {openDropdown === "m-marcas" && (
              <div className="pl-6 space-y-0.5">
                {brands.map(b => (
                  <Link key={b.slug} to={`/produtos?marca=${b.slug}`} onClick={closeAll}
                    className="flex items-center gap-2.5 py-2 px-3 font-body text-sm text-foreground/70 hover:text-primary hover:bg-muted rounded-md">
                    {b.logo_url && <img src={b.logo_url} alt={b.name} className="object-contain shrink-0" style={{ height: '26px', width: '26px' }} />}
                    {b.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile Classes */}
            <button onClick={() => setOpenDropdown(openDropdown === "m-classes" ? null : "m-classes")}
              className="w-full flex items-center justify-between py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">
              Classes <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === "m-classes" ? "rotate-180" : ""}`} />
            </button>
            {openDropdown === "m-classes" && (
              <div className="pl-6 space-y-0.5">
                {classes.map(cls => (
                  <div key={cls.slug}>
                    <Link to={`/produtos?classe=${cls.slug}`} onClick={closeAll}
                      className="block py-2 px-3 font-body text-sm font-medium text-foreground/70 hover:text-primary hover:bg-muted rounded-md">{cls.name}</Link>
                    {cls.children?.map(sub => (
                      <Link key={sub.slug} to={`/produtos?subclasse=${sub.slug}`} onClick={closeAll}
                        className="block py-1.5 px-3 pl-6 font-body text-xs text-foreground/60 hover:text-primary hover:bg-muted rounded-md">{sub.name}</Link>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <Link to="/atacado" onClick={closeAll} className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">Atacado</Link>
            <Link to="/orcamento" onClick={closeAll} className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">Orçamento B2B</Link>
            <Link to="/sobre" onClick={closeAll} className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">Sobre</Link>
            <Link to="/contato" onClick={closeAll} className="block py-2.5 px-3 font-display uppercase tracking-wider text-sm text-foreground/80 hover:text-primary hover:bg-muted rounded-md">Contato</Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default StoreHeader;
