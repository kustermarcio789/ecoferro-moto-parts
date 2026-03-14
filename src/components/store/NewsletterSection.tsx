import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        email: email.trim(),
        source: "newsletter" as const,
        consent: true,
      });
      if (error) throw error;
      toast({ title: "Inscrito com sucesso!", description: "Você receberá nossas novidades por e-mail." });
      setEmail("");
    } catch {
      toast({ title: "Erro", description: "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-primary py-16">
      <div className="container mx-auto px-4 text-center">
        <Mail className="h-10 w-10 text-primary-foreground/80 mx-auto mb-4" />
        <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground uppercase tracking-wide mb-3">
          Receba Nossas Ofertas
        </h2>
        <p className="text-primary-foreground/70 font-body mb-8 max-w-md mx-auto">
          Cadastre-se e receba promoções exclusivas, lançamentos e cupons de desconto.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu melhor e-mail"
            required
            className="flex-1 rounded-lg px-4 py-3 font-body text-sm bg-primary-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={loading} className="bg-eco-charcoal text-primary-foreground hover:bg-eco-charcoal/90 font-display uppercase tracking-wider">
            {loading ? "Enviando..." : "Cadastrar"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default NewsletterSection;
