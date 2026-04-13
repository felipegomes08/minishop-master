import {
  ShoppingBag,
  Package,
  BarChart3,
  Ticket,
  Globe,
  Users,
  Brain,
  Camera,
  Sparkles,
} from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

const features = [
  { icon: ShoppingBag, title: "Cadastro inteligente", desc: "Produtos com atributos dinâmicos e variantes personalizáveis" },
  { icon: Package, title: "Estoque automático", desc: "Cada venda atualiza seu estoque em tempo real, sem preocupação" },
  { icon: BarChart3, title: "Dashboards financeiros", desc: "Veja receita, lucro e crescimento em painéis visuais claros" },
  { icon: Ticket, title: "Cupons e promoções", desc: "Crie campanhas de desconto e acompanhe o resultado de cada uma" },
  { icon: Globe, title: "Catálogo online", desc: "Sua vitrine digital personalizável para compartilhar com clientes" },
  { icon: Users, title: "Gestão de clientes", desc: "CRM completo para conhecer e fidelizar seus compradores" },
  { icon: Brain, title: "Insights de IA", desc: "Recomendações automáticas para otimizar suas decisões" },
  { icon: Camera, title: "Importador por foto", desc: "Fotografe o pedido e a IA cadastra tudo automaticamente" },
  { icon: Sparkles, title: "Experimentador virtual", desc: "Seu cliente prova a peça pela tela do celular com IA" },
];

export default function FeaturesGrid() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="funcionalidades" className="py-20 lg:py-28 bg-[#0a0e1a]">
      <div
        ref={ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
          Tudo que sua loja precisa em um só lugar
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
          Do cadastro de produtos ao experimentador virtual — funcionalidades
          completas para crescer com tecnologia.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                <f.icon size={24} className="text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
