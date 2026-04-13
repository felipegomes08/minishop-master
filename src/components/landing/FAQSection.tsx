import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollReveal } from "./useScrollReveal";

const faqs = [
  {
    q: "O Lojix funciona para qualquer tipo de loja?",
    a: "O Lojix foi desenvolvido especialmente para lojas de moda, joias, calçados e acessórios — tanto físicas quanto online. Se você vende produtos nessas categorias, o sistema é perfeito para o seu negócio.",
  },
  {
    q: "Preciso de conhecimento técnico para usar?",
    a: "Não! O Lojix foi criado para ser simples e intuitivo. Você não precisa de nenhum conhecimento técnico. Em poucos minutos já estará usando todas as funcionalidades.",
  },
  {
    q: "Como funciona o experimentador virtual com IA?",
    a: "O cliente envia uma foto, seleciona a peça que deseja experimentar, e nossa inteligência artificial gera uma imagem realista mostrando como a peça ficaria nele. Tudo acontece em segundos, direto pelo catálogo online.",
  },
  {
    q: "Como funciona o importador de produtos por foto?",
    a: "Basta fotografar o pedido do seu fornecedor (nota fiscal, lista de produtos). A IA do Lojix lê automaticamente nome, quantidade e valor de cada item e cadastra tudo no sistema, atualizando seu estoque instantaneamente.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim! Não existe fidelidade ou multa de cancelamento. Você pode cancelar seu plano a qualquer momento, sem burocracia.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Absolutamente. Utilizamos criptografia de ponta a ponta e infraestrutura de nível empresarial para proteger todos os seus dados. Seus dados são seus — sempre.",
  },
];

export default function FAQSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="faq" className="py-20 lg:py-28 bg-[#0a0e1a]">
      <div
        ref={ref}
        className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
          Perguntas frequentes
        </h2>
        <p className="text-gray-400 text-center mb-12">
          Tudo que você precisa saber antes de começar.
        </p>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-white/10 rounded-xl px-5 bg-white/5 data-[state=open]:border-violet-500/30"
            >
              <AccordionTrigger className="text-white text-left hover:no-underline py-4 text-sm sm:text-base">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 text-sm pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
