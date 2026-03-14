import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, UserCheck, ShieldCheck } from "lucide-react";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WholesalePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "",
    contact_name: "", email: "", phone: "", city: "", state: "", segment: "",
  });

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

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
      toast({ title: "Cadastro enviado!", description: "Analisaremos seus dados e retornaremos em breve." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />

      {/* Hero */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-wide mb-3">
            Canal Atacado
          </h1>
          <p className="font-body text-lg opacity-80 max-w-2xl mx-auto">
            Condições exclusivas para revendedores, distribuidores e compradores em volume. Cadastre-se e acesse preços especiais.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Building2, title: "Preços Exclusivos", desc: "Tabela diferenciada com descontos progressivos por volume" },
              { icon: UserCheck, title: "Atendimento Dedicado", desc: "Suporte comercial especializado para sua empresa" },
              { icon: ShieldCheck, title: "Condições Flexíveis", desc: "Negociação personalizada e condições de pagamento especiais" },
            ].map(b => (
              <div key={b.title} className="text-center p-6 bg-card rounded-xl border border-border">
                <b.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-1">{b.title}</h3>
                <p className="text-xs text-muted-foreground font-body">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {submitted ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border p-8">
                <UserCheck className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-2">Cadastro Recebido!</h2>
                <p className="text-muted-foreground font-body">Nossa equipe comercial analisará seus dados e entrará em contato em breve com as condições especiais.</p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider mb-6 text-center">Cadastro Atacadista</h2>
                <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-xl border border-border p-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Razão Social *</label>
                      <input required value={form.razao_social} onChange={e => update("razao_social", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Nome Fantasia</label>
                      <input value={form.nome_fantasia} onChange={e => update("nome_fantasia", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">CNPJ *</label>
                      <input required value={form.cnpj} onChange={e => update("cnpj", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Inscrição Estadual</label>
                      <input value={form.inscricao_estadual} onChange={e => update("inscricao_estadual", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-body font-medium text-foreground mb-1 block">Nome do Responsável *</label>
                    <input required value={form.contact_name} onChange={e => update("contact_name", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">E-mail *</label>
                      <input type="email" required value={form.email} onChange={e => update("email", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Telefone *</label>
                      <input type="tel" required value={form.phone} onChange={e => update("phone", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Cidade</label>
                      <input value={form.city} onChange={e => update("city", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Estado</label>
                      <input value={form.state} onChange={e => update("state", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-foreground mb-1 block">Segmento</label>
                      <input value={form.segment} onChange={e => update("segment", e.target.value)} placeholder="Ex: Oficina, Revenda" className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
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
            )}
          </div>
        </div>
      </section>

      <StoreFooter />
    </div>
  );
};

export default WholesalePage;
