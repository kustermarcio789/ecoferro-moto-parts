import { Link, Navigate, NavLink, useLocation } from "react-router-dom";
import { Building2, ClipboardList, LayoutDashboard, LogOut, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleCustomer } from "@/hooks/useWholesaleCustomer";

const nav = [
  { to: "/atacado/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/atacado/catalogo", label: "Catálogo", icon: ShoppingBag },
  { to: "/atacado/pedidos", label: "Meus Pedidos", icon: ClipboardList },
];

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Aguardando aprovação", cls: "bg-amber-100 text-amber-800" },
    analyzing: { label: "Em análise", cls: "bg-blue-100 text-blue-800" },
    approved: { label: "Aprovado", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Rejeitado", cls: "bg-red-100 text-red-700" },
    blocked: { label: "Bloqueado", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] || { label: status, cls: "bg-muted" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body ${m.cls}`}>{m.label}</span>
  );
};

const WholesalePortalLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { wholesaleCustomer, loading } = useWholesaleCustomer();
  const location = useLocation();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/atacado/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (!wholesaleCustomer) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-lg bg-card rounded-2xl border border-border p-8 text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-2">
            Cadastro Atacadista Não Encontrado
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-5">
            Não localizamos um cadastro atacadista vinculado ao e-mail <strong>{user.email}</strong>. Solicite cadastro
            ou peça ao time comercial para vincular sua conta.
          </p>
          <Link to="/atacado" className="text-primary text-sm font-body hover:underline">
            Solicitar cadastro atacadista →
          </Link>
        </div>
      </div>
    );
  }
  if (wholesaleCustomer.status !== "approved") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-lg bg-card rounded-2xl border border-border p-8 text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold uppercase tracking-wider text-foreground mb-2">
            Cadastro em Análise
          </h1>
          <div className="mb-3"><StatusBadge status={wholesaleCustomer.status} /></div>
          <p className="text-sm text-muted-foreground font-body mb-5">
            Olá, <strong>{wholesaleCustomer.contact_name}</strong>. O seu cadastro de <strong>{wholesaleCustomer.razao_social}</strong>{" "}
            está em análise pelo nosso time comercial. Avisaremos por e-mail assim que ele for aprovado.
          </p>
          <button onClick={() => signOut()} className="text-sm text-muted-foreground font-body hover:text-foreground">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/atacado/painel" className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-display text-base font-bold uppercase tracking-wider text-primary">
              Portal Atacadista
            </span>
          </Link>
          <div className="text-right text-xs">
            <div className="font-body font-medium text-foreground">{wholesaleCustomer.razao_social}</div>
            <div className="text-muted-foreground">{wholesaleCustomer.cnpj}</div>
          </div>
        </div>
        <nav className="container mx-auto px-4 flex items-center justify-between gap-2 border-t border-border">
          <div className="flex items-center gap-1 overflow-x-auto">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/atacado/painel"}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-2.5 px-3 text-xs uppercase tracking-wider font-display transition-colors border-b-2 ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-foreground/70 hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 py-2 px-3 text-xs font-body text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-6 lg:py-10">{children}</main>
    </div>
  );
};

export default WholesalePortalLayout;
