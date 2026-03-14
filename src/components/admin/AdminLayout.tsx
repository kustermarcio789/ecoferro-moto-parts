import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag, FileText,
  BarChart3, Settings, LogOut, Menu, X, MessageSquare, Star,
  Megaphone, Boxes, HandCoins, TrendingUp, UserCheck, Store, ShoppingCart
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Produtos", href: "/admin/produtos", icon: Package },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Leads", href: "/admin/leads", icon: MessageSquare },
  { label: "Orçamentos", href: "/admin/orcamentos", icon: FileText },
  { label: "Avaliações", href: "/admin/avaliacoes", icon: Star },
  { label: "Cupons", href: "/admin/cupons", icon: Tag },
  { label: "Banners", href: "/admin/banners", icon: Megaphone },
  { label: "Estoque", href: "/admin/estoque", icon: Boxes },
  { label: "Parceiros", href: "/admin/parceiros", icon: HandCoins },
  { label: "Atacado", href: "/admin/atacado", icon: Store },
  { label: "Carrinhos", href: "/admin/carrinhos-abandonados", icon: ShoppingCart },
  { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

const AdminLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-card border-b border-border px-4 py-3">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-display text-lg uppercase tracking-wider font-bold text-primary">EcoFerro Admin</span>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><LogOut className="h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="flex">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border z-50 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/admin" className="font-display text-lg uppercase tracking-wider font-bold text-primary">
              EcoFerro
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {adminNav.map(item => {
              const isActive = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border space-y-1">
            {user && (
              <p className="px-3 py-1 text-xs text-muted-foreground font-body truncate">{user.email}</p>
            )}
            <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body text-foreground/70 hover:text-foreground hover:bg-muted">
              <Store className="h-4 w-4" />
              Ver Loja
            </Link>
            <button onClick={signOut} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body text-destructive/70 hover:text-destructive hover:bg-destructive/5 w-full">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        <main className="flex-1 min-h-screen">
          <div className="hidden lg:flex items-center justify-between bg-card border-b border-border px-8 py-4">
            <h1 className="font-display text-xl font-bold text-foreground uppercase tracking-wider">{title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-body">{user?.email}</span>
              <Button variant="outline" size="sm" asChild>
                <Link to="/">Ver Loja</Link>
              </Button>
            </div>
          </div>
          <div className="p-4 lg:p-8">
            <h1 className="lg:hidden font-display text-xl font-bold text-foreground uppercase tracking-wider mb-6">{title}</h1>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
