import { useState } from "react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const QuotePage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    cnpj: "",
    contact_name: "",
    email: "",
    phone: "",
    observations: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("quotes").insert({
        company_name: form.company_name,
        cnpj: form.cnpj,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        observations: form.observations,
        items: [],
        status: "new" as const,
      });
      if (error) throw error;
      toast({ title: "Orçamento enviado!", description: "Entraremos em contato em breve." });
      setForm({ company_name: "", cnpj: "", contact_name: "", email: "", phone: "", observations: "" });
    } catch {
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide mb-4">
            Solicitar Orçamento B2B
          </h1>
          <p className="text-muted-foreground font-body mb-8">
            Preencha o formulário abaixo e nossa equipe comercial entrará em contato com a melhor proposta para sua empresa.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-body font-medium text-foreground mb-1 block">Empresa</label>
                <input value={form.company_name} onChange={e => update("company_name", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-body font-medium text-foreground mb-1 block">CNPJ</label>
                <input value={form.cnpj} onChange={e => update("cnpj", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-sm font-body font-medium text-foreground mb-1 block">Nome do Responsável *</label>
              <input required value={form.contact_name} onChange={e => update("contact_name", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-body font-medium text-foreground mb-1 block">E-mail *</label>
                <input type="email" required value={form.email} onChange={e => update("email", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-body font-medium text-foreground mb-1 block">Telefone *</label>
                <input type="tel" required value={form.phone} onChange={e => update("phone", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-sm font-body font-medium text-foreground mb-1 block">Produtos de Interesse / Observações</label>
              <textarea rows={5} value={form.observations} onChange={e => update("observations", e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" required id="consent" className="mt-1" />
              <label htmlFor="consent" className="text-xs text-muted-foreground font-body">
                Autorizo a EcoFerro a entrar em contato para fins comerciais conforme a LGPD.
              </label>
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full font-display uppercase tracking-wider">
              {loading ? "Enviando..." : "Enviar Solicitação de Orçamento"}
            </Button>
          </form>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
};

export default QuotePage;
