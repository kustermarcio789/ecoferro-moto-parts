import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Como faço para encontrar a peça certa para minha moto?", a: "Use nossa busca inteligente por marca, modelo ou tipo de peça. Cada produto possui informações de compatibilidade detalhadas." },
  { q: "Vocês enviam para todo o Brasil?", a: "Sim! Trabalhamos com as principais transportadoras e Correios. Frete grátis para compras acima de R$ 299." },
  { q: "Qual o prazo de entrega?", a: "O prazo varia de acordo com a região. Após a confirmação do pagamento, o envio é feito em até 2 dias úteis." },
  { q: "Como funciona a garantia?", a: "Todos os nossos produtos possuem garantia de fábrica. Em caso de defeito, entre em contato para realizar a troca." },
  { q: "Vocês vendem no atacado?", a: "Sim! Temos condições especiais para revendedores e compradores em quantidade. Solicite um orçamento B2B ou cadastre-se como atacadista." },
  { q: "Quais formas de pagamento vocês aceitam?", a: "Cartão de crédito (até 12x), Pix com 5% de desconto, e boleto bancário." },
  { q: "Posso trocar ou devolver um produto?", a: "Sim, seguimos o Código de Defesa do Consumidor. Você tem até 7 dias após o recebimento para solicitar a devolução." },
  { q: "Como faço um orçamento para minha empresa?", a: "Acesse nossa página de Orçamento B2B, preencha o formulário com os dados da sua empresa e os produtos de interesse." },
];

const FAQSection = () => (
  <section className="py-20 bg-muted/50">
    <div className="container mx-auto px-4 max-w-3xl">
      <div className="text-center mb-12">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground uppercase tracking-wide">Perguntas Frequentes</h2>
        <p className="mt-3 text-muted-foreground font-body text-lg">Tire suas dúvidas sobre nossos produtos e serviços</p>
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-6">
            <AccordionTrigger className="font-display text-sm font-semibold text-foreground uppercase tracking-wider hover:no-underline py-5">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground font-body text-sm pb-5">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
