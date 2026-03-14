import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login?redirect=/admin" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="text-center bg-card rounded-xl border border-border p-8 max-w-md">
          <h1 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground font-body mb-4">Você não tem permissão para acessar o painel administrativo.</p>
          <a href="/" className="text-primary font-body text-sm hover:underline">Voltar para a loja</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
