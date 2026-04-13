import { Brain, TrendingDown, Clock, UserX, Package } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

const insights = [
  {
    icon: TrendingDown,
    title: "Produtos com baixa saída",
    desc: '"Anel Trilogy teve queda de 40% nas vendas este mês. Considere criar uma promoção."',
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Clock,
    title: "Horários de pico",
    desc: '"Suas vendas concentram-se entre 14h e 17h. Programe postagens para esse período."',
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: UserX,
    title: "Clientes inativos",
    desc: '"12 clientes não compram há mais de 60 dias. Envie um cupom de reativação."',
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: Package,
    title: "Tendências de estoque",
    desc: '"Colares estão com estoque crítico (3 unidades). Reposição recomendada."',
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
];

export default function AIInsightsSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a] via-blue-950/30 to-[#0a0e1a]" />

      <div
        ref={ref}
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-16">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Brain size={28} className="text-violet-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Insights Inteligentes com IA
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Como ter um consultor de negócios trabalhando 24h por dia pela sua loja.
            A IA analisa seus dados e gera recomendações automáticas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {insights.map((ins, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg ${ins.bg} flex items-center justify-center`}>
                  <ins.icon size={18} className={ins.color} />
                </div>
                <h3 className="font-semibold text-white">{ins.title}</h3>
              </div>
              <p className="text-sm text-gray-400 italic">{ins.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
