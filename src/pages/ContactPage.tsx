import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ContactPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from("leads").insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        source: "contact_form" as const,
        consent: true,
      });
      toast({ title: "Mensagem enviada!", description: "Responderemos em breve." });
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide mb-4">Contato</h1>
            <p className="text-muted-foreground font-body mb-8">Entre em contato conosco para dúvidas, sugestões ou orçamentos.</p>

            <div className="space-y-4 mb-8">
              {[
                { icon: Phone, label: "(11) 99999-9999" },
                { icon: Mail, label: "contato@ecoferro.com.br" },
                { icon: MapPin, label: "São Paulo, SP - Brasil" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-3 text-foreground font-body">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  {c.label}
                </div>
              ))}
            </div>

            <Button className="font-display uppercase tracking-wider" asChild>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Falar pelo WhatsApp
              </a>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-body font-medium text-foreground mb-1 block">Nome *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-body font-medium text-foreground mb-1 block">E-mail *</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-body font-medium text-foreground mb-1 block">Telefone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-sm font-body font-medium text-foreground mb-1 block">Mensagem *</label>
              <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-display uppercase tracking-wider">
              {loading ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </form>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
};

export default ContactPage;
