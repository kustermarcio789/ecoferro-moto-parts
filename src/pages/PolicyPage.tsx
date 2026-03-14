import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { useParams } from "react-router-dom";

const policies: Record<string, { title: string; content: string }> = {
  "politica-trocas": {
    title: "Política de Trocas e Devoluções",
    content: `A EcoFerro segue as normas do Código de Defesa do Consumidor (CDC).

**Prazo para devolução:** Você tem até 7 (sete) dias corridos após o recebimento do produto para solicitar a devolução por arrependimento.

**Produtos com defeito:** Em caso de defeito de fabricação, o prazo para troca é de 30 (trinta) dias corridos a partir do recebimento.

**Como solicitar:** Entre em contato pelo WhatsApp ou e-mail informando o número do pedido e o motivo da troca/devolução. Nossa equipe fornecerá as instruções para envio.

**Condições:** O produto deve estar em sua embalagem original, sem sinais de uso ou instalação. Produtos instalados não são elegíveis para devolução por arrependimento.

**Reembolso:** Após recebermos e aprovarmos a devolução, o reembolso será processado em até 10 dias úteis, pelo mesmo meio de pagamento utilizado na compra.`
  },
  "politica-envio": {
    title: "Política de Envio",
    content: `**Prazo de postagem:** Os produtos são postados em até 2 (dois) dias úteis após a confirmação do pagamento.

**Transportadoras:** Trabalhamos com Correios e transportadoras privadas para garantir a melhor opção de frete.

**Frete grátis:** Para compras acima de R$ 299,00 (válido para todo o Brasil continental).

**Rastreamento:** Após a postagem, você receberá o código de rastreamento por e-mail.

**Prazo de entrega:** O prazo de entrega varia de acordo com a região e a modalidade de frete escolhida. Consulte o prazo estimado no momento da compra.

**Endereço:** É de responsabilidade do comprador informar o endereço correto e completo. Custos de reenvio por endereço incorreto serão cobrados.`
  },
  "termos": {
    title: "Termos de Uso",
    content: `Ao utilizar o site EcoFerro, você concorda com os seguintes termos:

**1. Uso do Site:** Este site é destinado à compra de peças e acessórios para motos. O uso indevido ou fraudulento pode resultar em bloqueio de acesso.

**2. Cadastro:** As informações fornecidas no cadastro devem ser verdadeiras e atualizadas. A EcoFerro reserva-se o direito de cancelar cadastros com informações falsas.

**3. Preços:** Os preços podem ser alterados sem aviso prévio. O preço válido é o exibido no momento da finalização da compra.

**4. Disponibilidade:** A disponibilidade dos produtos está sujeita ao estoque. Em caso de indisponibilidade após a compra, o cliente será notificado e poderá optar por substituição ou reembolso.

**5. Propriedade Intelectual:** Todo o conteúdo do site (imagens, textos, logos) é propriedade da EcoFerro e não pode ser reproduzido sem autorização.

**6. Limitação de Responsabilidade:** A EcoFerro não se responsabiliza por danos decorrentes do uso inadequado dos produtos ou instalação incorreta.`
  },
  "politica-privacidade": {
    title: "Política de Privacidade",
    content: `A EcoFerro respeita sua privacidade e está comprometida com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

**Dados coletados:** Nome, e-mail, telefone, CPF/CNPJ, endereço de entrega e informações de pagamento.

**Finalidade:** Os dados são utilizados exclusivamente para: processamento de pedidos, entrega de produtos, comunicação sobre pedidos, envio de promoções (com consentimento) e cumprimento de obrigações legais.

**Compartilhamento:** Seus dados podem ser compartilhados com: transportadoras (para entrega), gateways de pagamento (para processamento) e autoridades (quando exigido por lei).

**Segurança:** Utilizamos criptografia e boas práticas de segurança para proteger seus dados.

**Seus direitos:** Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados a qualquer momento, entrando em contato pelo e-mail contato@ecoferro.com.br.

**Cookies:** Utilizamos cookies para melhorar sua experiência. Consulte nossa Política de Cookies para mais detalhes.`
  },
  "politica-cookies": {
    title: "Política de Cookies",
    content: `**O que são cookies?** Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita nosso site.

**Cookies utilizados:**
- **Essenciais:** Necessários para o funcionamento do site (carrinho, sessão, autenticação).
- **Analíticos:** Nos ajudam a entender como os visitantes interagem com o site (Google Analytics).
- **Marketing:** Utilizados para exibir anúncios relevantes (Meta Pixel, Google Ads).

**Gerenciamento:** Você pode configurar seu navegador para bloquear ou excluir cookies. Note que isso pode afetar a funcionalidade do site.

**Consentimento:** Ao continuar navegando em nosso site após o aviso de cookies, você consente com o uso dos cookies descritos acima.`
  },
  faq: {
    title: "Perguntas Frequentes",
    content: `**Como faço para encontrar a peça certa?**
Use nossa busca por marca, modelo ou tipo de peça. Cada produto possui informações de compatibilidade.

**Vocês enviam para todo o Brasil?**
Sim! Frete grátis para compras acima de R$ 299.

**Qual o prazo de entrega?**
Após confirmação do pagamento, postamos em até 2 dias úteis. O prazo total depende da região.

**Como funciona a garantia?**
Todos os produtos possuem garantia de fábrica contra defeitos.

**Vocês vendem no atacado?**
Sim! Cadastre-se como atacadista ou solicite um orçamento B2B.

**Quais formas de pagamento?**
Cartão (até 12x), Pix (5% off) e boleto.

**Posso trocar ou devolver?**
Sim, em até 7 dias após o recebimento (conforme CDC).`
  },
};

const PolicyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const policy = policies[slug || ""];

  if (!policy) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Página não encontrada</h1>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide mb-8">{policy.title}</h1>
          <div className="prose prose-sm max-w-none font-body text-muted-foreground">
            {policy.content.split("\n\n").map((p, i) => (
              <p key={i} className="mb-4 whitespace-pre-wrap" dangerouslySetInnerHTML={{
                __html: p.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
              }} />
            ))}
          </div>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
};

export default PolicyPage;
