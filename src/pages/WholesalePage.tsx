import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useWholesaleCustomer } from "@/hooks/useWholesaleCustomer";

const initialForm = {
  razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "",
  contact_name: "", email: "", phone: "", city: "", state: "", segment: "",
};

const WholesalePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wholesaleCustomer } = useWholesaleCustomer();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (user && wholesaleCustomer?.status === "approved") {
      navigate("/atacado/painel", { replace: true });
    }
  }, [user, wholesaleCustomer, navigate]);

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("wholesale_customers").insert({
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia,
        cnpj: form.cnpj,
        inscricao_estadual: form.inscricao_estadual,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        segment: form.segment,
        status: "pending",
        customer_type: "wholesale",
      });
      if (error) throw error;
      setSubmitted(true);
      toast({
        title: "Cadastro enviado!",
        description: "Após aprovação enviaremos seu login (CNPJ) e senha provisória.",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message ?? "Tente novamente.", variant: "destructive" });
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
              { icon: ClipboardCheck, title: "Pedidos Online", desc: "Solicite quantidades e prazo desejado direto no portal" },
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
            {submitted ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border p-8">
                <UserCheck className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-2">
                  Cadastro Recebido!
                </h2>
                <p className="text-muted-foreground font-body mb-2">
                  O cadastro de <strong>{form.razao_social}</strong> está em análise pela nossa equipe comercial.
                </p>
                <p className="text-muted-foreground font-body mb-6">
                  Após a aprovação, você receberá um <strong>e-mail/WhatsApp com seu login (o próprio CNPJ) e a
                  senha provisória</strong> para acessar o portal atacadista.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" variant="outline">
                    <Link to="/atacado/login" className="font-display uppercase tracking-wider">
                      Já recebi minhas credenciais → Entrar
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    <Link to="/" className="font-display uppercase tracking-wider">Voltar para a loja</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider">
                    Solicitar Cadastro
                  </h2>
                  <Link
                    to="/atacado/login"
                    className="text-sm text-primary font-body hover:underline whitespace-nowrap"
                  >
                    Já tenho cadastro →
                  </Link>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-xl border border-border p-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Razão Social *" value={form.razao_social} onChange={(v) => update("razao_social", v)} required />
                    <Field label="Nome Fantasia" value={form.nome_fantasia} onChange={(v) => update("nome_fantasia", v)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="CNPJ * (será seu login)" value={form.cnpj} onChange={(v) => update("cnpj", v)} required placeholder="00.000.000/0000-00" />
                    <Field label="Inscrição Estadual" value={form.inscricao_estadual} onChange={(v) => update("inscricao_estadual", v)} />
                  </div>
                  <Field label="Nome do Responsável *" value={form.contact_name} onChange={(v) => update("contact_name", v)} required />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="E-mail *" value={form.email} onChange={(v) => update("email", v)} required type="email" />
                    <Field label="Telefone / WhatsApp *" value={form.phone} onChange={(v) => update("phone", v)} required type="tel" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="Cidade" value={form.city} onChange={(v) => update("city", v)} />
                    <Field label="Estado" value={form.state} onChange={(v) => update("state", v)} />
                    <Field label="Segmento" value={form.segment} onChange={(v) => update("segment", v)} placeholder="Oficina, Revenda..." />
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
                <p className="text-xs text-muted-foreground font-body text-center mt-4">
                  Após aprovação você receberá login (CNPJ) e senha provisória pelo WhatsApp ou e-mail informados.
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
