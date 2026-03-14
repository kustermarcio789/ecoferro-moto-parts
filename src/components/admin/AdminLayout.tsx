import { Link } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, FileText, BarChart3, Settings, LogOut, Menu, X, MessageSquare, Star, Megaphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Produtos", href: "/admin/produtos", icon: Package },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Cupons", href: "/admin/cupons", icon: Tag },
  { label: "Leads", href: "/admin/leads", icon: MessageSquare },
  { label: "Orçamentos", href: "/admin/orcamentos", icon: FileText },
  { label: "Avaliações", href: "/admin/avaliacoes", icon: Star },
  { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
  { label: "Marketing", href: "/admin/marketing", icon: Megaphone },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

const AdminLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border z-50 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/admin" className="font-display text-lg uppercase tracking-wider font-bold text-primary">
              EcoFerro
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {adminNav.map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-3 border-t border-border">
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-foreground/70 hover:text-foreground hover:bg-muted">
              <LogOut className="h-4 w-4" />
              Voltar à Loja
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-screen">
          <div className="hidden lg:flex items-center justify-between bg-card border-b border-border px-8 py-4">
            <h1 className="font-display text-xl font-bold text-foreground uppercase tracking-wider">{title}</h1>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Ver Loja</Link>
            </Button>
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
