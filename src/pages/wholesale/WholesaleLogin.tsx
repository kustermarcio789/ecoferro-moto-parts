import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const onlyDigits = (s: string) => s.replace(/[^0-9]/g, "");
const looksLikeCnpj = (s: string) => onlyDigits(s).length >= 11;

const WholesaleLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/atacado/painel", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let email = identifier.trim();
      const isCnpj = looksLikeCnpj(identifier) && !email.includes("@");
      if (isCnpj) {
        const { data: resolved, error } = await supabase.rpc("get_wholesale_email_by_cnpj", {
          p_cnpj: onlyDigits(identifier),
        });
        if (error) throw error;
        if (!resolved) {
          throw new Error(
            "CNPJ não encontrado ou cadastro ainda não aprovado. Aguarde aprovação ou solicite cadastro.",
          );
        }
        email = resolved as string;
      }
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast({ title: "Bem-vindo!", description: "Redirecionando para o portal..." });
      navigate("/atacado/painel");
    } catch (err: any) {
      toast({
        title: "Não foi possível entrar",
        description: err?.message ?? "Verifique seus dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-eco p-8">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider">
            Portal Atacadista
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Acesse com o CNPJ cadastrado e a senha provisória que enviamos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-body font-medium text-foreground mb-1 block">
              CNPJ ou e-mail
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="00.000.000/0000-00 ou e-mail"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-body font-medium text-foreground mb-1 block">Senha</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full font-display uppercase tracking-wider py-5"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-5 pt-5 border-t border-border text-center space-y-2">
          <Link to="/atacado" className="block text-sm text-primary font-body hover:underline">
            Não tem cadastro? Solicitar cadastro atacadista →
          </Link>
          <Link to="/" className="block text-xs text-muted-foreground font-body hover:text-foreground">
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WholesaleLogin;
