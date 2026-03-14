import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn } from "lucide-react";
import logo from "@/assets/ecoferro-logo.jpeg";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar o cadastro." });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate(redirect);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-eco p-8">
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logo} alt="EcoFerro" className="h-12 mx-auto mb-4 object-contain" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider">
            {isSignUp ? "Criar Conta" : "Entrar"}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {isSignUp ? "Preencha os dados para criar sua conta" : "Acesse sua conta EcoFerro"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-sm font-body font-medium text-foreground mb-1 block">Nome Completo</label>
              <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
          <div>
            <label className="text-sm font-body font-medium text-foreground mb-1 block">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-body font-medium text-foreground mb-1 block">Senha</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-wider py-5">
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Aguarde..." : isSignUp ? "Criar Conta" : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary font-body hover:underline">
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground font-body hover:text-foreground">← Voltar para a loja</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
