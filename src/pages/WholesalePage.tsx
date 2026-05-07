import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, LogIn, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useWholesaleCustomer } from "@/hooks/useWholesaleCustomer";

type Mode = "register" | "login" | "signup";

const WholesalePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signIn, signUp } = useAuth();
  const { wholesaleCustomer } = useWholesaleCustomer();
  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) || "register",
  );
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "",
    contact_name: "", email: "", phone: "", city: "", state: "", segment: "",
  });
  const [authForm, setAuthForm] = useState({ email: "", password: "", confirm: "", fullName: "" });

  // If already logged in and approved, redirect
  useEffect(() => {
    if (user && wholesaleCustomer?.status === "approved") {
      navigate("/atacado/painel", { replace: true });
    }
  }, [user, wholesaleCustomer, navigate]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("mode", m);
      return next;
    });
  };

  const updateRegister = (key: keyof typeof registerForm, value: string) =>
    setRegisterForm((f) => ({ ...f, [key]: value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("wholesale_customers").insert({
        razao_social: registerForm.razao_social,
        nome_fantasia: registerForm.nome_fantasia,
        cnpj: registerForm.cnpj,
        inscricao_estadual: registerForm.inscricao_estadual,
        contact_name: registerForm.contact_name,
        email: registerForm.email,
        phone: registerForm.phone,
        city: registerForm.city,
        state: registerForm.state,
        segment: registerForm.segment,
        status: "pending",
        customer_type: "wholesale",
      });
      if (error) throw error;
      setSubmitted(true);
      setAuthForm((f) => ({ ...f, email: registerForm.email, fullName: registerForm.contact_name }));
      toast({
        title: "Cadastro enviado!",
        description: "Próximo passo: crie sua senha para acompanhar o pedido após aprovação.",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(authForm.email, authForm.password);
      if (error) throw error;
      toast({ title: "Bem-vindo!" });
      navigate("/atacado/painel");
    } catch (err: any) {
      toast({ title: "Erro ao entrar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.password !== authForm.confirm) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(authForm.email, authForm.password, authForm.fullName);
      if (error) throw error;
      toast({
        title: "Conta criada!",
        description: "Verifique seu e-mail para confirmar. Após aprovação do cadastro, você terá acesso ao portal.",
      });
      switchMode("login");
    } catch (err: any) {
      toast({ title: "Erro ao criar conta", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-wide mb-3">
            Canal Atacado
          </h1>
          <p className="font-body text-lg opacity-80 max-w-2xl mx-auto">
            Cadastre sua empresa, faça pedidos online e acompanhe a produção em tempo real, etapa por etapa.
          </p>
        </div>
      </section>

      <section className="py-10 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Building2, title: "Preços Exclusivos", desc: "Tabela diferenciada com descontos progressivos por volume" },
              { icon: UserCheck, title: "Pedidos Online", desc: "Solicite quantidades, prazo e acompanhe a produção em tempo real" },
              { icon: ShieldCheck, title: "Acompanhamento %", desc: "Veja o progresso de cada etapa: corte, soldagem, pintura, expedição" },
            ].map((b) => (
              <div key={b.title} className="text-center p-6 bg-card rounded-xl border border-border">
                <b.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-1">
                  {b.title}
                </h3>
                <p className="text-xs text-muted-foreground font-body">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <ModeButton active={mode === "register"} onClick={() => switchMode("register")}>
                Solicitar Cadastro
              </ModeButton>
              <ModeButton active={mode === "signup"} onClick={() => switchMode("signup")}>
                Criar Conta
              </ModeButton>
              <ModeButton active={mode === "login"} onClick={() => switchMode("login")}>
                Entrar no Portal
              </ModeButton>
            </div>

            {/* REGISTER company */}
            {mode === "register" && (
              submitted ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border p-8">
                  <UserCheck className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-2">
                    Cadastro Recebido!
                  </h2>
                  <p className="text-muted-foreground font-body mb-6">
                    Nossa equipe comercial analisará os dados de <strong>{registerForm.razao_social}</strong> e
                    aprovará sua conta em até 24h úteis. Crie agora sua senha de acesso para já entrar no portal assim
                    que aprovado.
                  </p>
                  <Button onClick={() => switchMode("signup")} size="lg" className="font-display uppercase tracking-wider">
                    Criar minha senha →
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-6 text-center">
                    Cadastro Atacadista
                  </h2>
                  <form onSubmit={handleRegister} className="space-y-4 bg-card rounded-xl border border-border p-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Razão Social *" value={registerForm.razao_social} onChange={(v) => updateRegister("razao_social", v)} required />
                      <Field label="Nome Fantasia" value={registerForm.nome_fantasia} onChange={(v) => updateRegister("nome_fantasia", v)} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="CNPJ *" value={registerForm.cnpj} onChange={(v) => updateRegister("cnpj", v)} required />
                      <Field label="Inscrição Estadual" value={registerForm.inscricao_estadual} onChange={(v) => updateRegister("inscricao_estadual", v)} />
                    </div>
                    <Field label="Nome do Responsável *" value={registerForm.contact_name} onChange={(v) => updateRegister("contact_name", v)} required />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="E-mail *" value={registerForm.email} onChange={(v) => updateRegister("email", v)} required type="email" />
                      <Field label="Telefone *" value={registerForm.phone} onChange={(v) => updateRegister("phone", v)} required type="tel" />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <Field label="Cidade" value={registerForm.city} onChange={(v) => updateRegister("city", v)} />
                      <Field label="Estado" value={registerForm.state} onChange={(v) => updateRegister("state", v)} />
                      <Field label="Segmento" value={registerForm.segment} onChange={(v) => updateRegister("segment", v)} placeholder="Oficina, Revenda..." />
                    </div>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" required id="consent-w" className="mt-1" />
                      <label htmlFor="consent-w" className="text-xs text-muted-foreground font-body">
                        Autorizo a EcoFerro a entrar em contato para fins comerciais conforme a LGPD.
                      </label>
                    </div>
                    <Button type="submit" disabled={loading} size="lg" className="w-full font-display uppercase tracking-wider">
                      {loading ? "Enviando..." : "Solicitar Cadastro Atacadista"}
                    </Button>
                  </form>
                </>
              )
            )}

            {/* SIGN UP (criar conta) */}
            {mode === "signup" && (
              <>
                <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-3 text-center">
                  Criar Conta
                </h2>
                <p className="text-sm text-muted-foreground font-body mb-6 text-center max-w-md mx-auto">
                  Use o mesmo e-mail informado no cadastro da empresa. Sua conta será automaticamente vinculada após
                  aprovação.
                </p>
                <form onSubmit={handleSignup} className="space-y-4 bg-card rounded-xl border border-border p-6">
                  <Field label="Nome completo" value={authForm.fullName} onChange={(v) => setAuthForm((f) => ({ ...f, fullName: v }))} required />
                  <Field label="E-mail" value={authForm.email} onChange={(v) => setAuthForm((f) => ({ ...f, email: v }))} required type="email" />
                  <Field label="Senha" value={authForm.password} onChange={(v) => setAuthForm((f) => ({ ...f, password: v }))} required type="password" />
                  <Field label="Confirme a senha" value={authForm.confirm} onChange={(v) => setAuthForm((f) => ({ ...f, confirm: v }))} required type="password" />
                  <Button type="submit" disabled={loading} size="lg" className="w-full font-display uppercase tracking-wider">
                    {loading ? "Criando..." : "Criar Conta"}
                  </Button>
                </form>
              </>
            )}

            {/* LOGIN */}
            {mode === "login" && (
              <>
                <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-6 text-center">
                  Entrar no Portal Atacado
                </h2>
                <form onSubmit={handleLogin} className="space-y-4 bg-card rounded-xl border border-border p-6">
                  <Field label="E-mail" value={authForm.email} onChange={(v) => setAuthForm((f) => ({ ...f, email: v }))} required type="email" />
                  <Field label="Senha" value={authForm.password} onChange={(v) => setAuthForm((f) => ({ ...f, password: v }))} required type="password" />
                  <Button type="submit" disabled={loading} size="lg" className="w-full font-display uppercase tracking-wider">
                    <LogIn className="h-4 w-4 mr-2" />
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground font-body text-center mt-3">
                  <Link to="/login" className="hover:underline">Login geral da loja</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <StoreFooter />
    </div>
  );
};

const ModeButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-xs font-body font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground/70 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const Field = ({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) => (
  <div>
    <label className="text-xs font-body font-medium text-foreground mb-1 block">{label}</label>
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
);

export default WholesalePage;
