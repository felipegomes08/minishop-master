import { AlertTriangle, CheckCircle, PackageX, TrendingDown, Eye, BarChart3, Brain, ShoppingCart } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

const problems = [
  { icon: PackageX, text: "Estoque descontrolado e perdas constantes" },
  { icon: TrendingDown, text: "Sem visão financeira clara do negócio" },
  { icon: Eye, text: "Catálogo desatualizado afastando clientes" },
  { icon: AlertTriangle, text: "Perda de vendas por falta de experiência de compra" },
];

const solutions = [
  { icon: BarChart3, text: "Estoque automatizado vinculado a cada venda" },
  { icon: ShoppingCart, text: "Dashboards financeiros em tempo real" },
  { icon: CheckCircle, text: "Catálogo online sempre atualizado e personalizável" },
  { icon: Brain, text: "IA que vende pelo seu cliente — experimentação virtual" },
];

export default function ProblemSolutionSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-20 lg:py-28 bg-[#0a0e1a]">
      <div
        ref={ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
          O problema que você conhece bem
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
          Gerenciar uma loja sem a tecnologia certa é nadar contra a corrente.
          O Lojix resolve tudo isso em um só lugar.
        </p>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Problems */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-400 mb-6 flex items-center gap-2">
              <AlertTriangle size={20} /> Sem o Lojix
            </h3>
            {problems.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10"
              >
                <p.icon size={20} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-gray-300">{p.text}</p>
              </div>
            ))}
          </div>
          {/* Solutions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-emerald-400 mb-6 flex items-center gap-2">
              <CheckCircle size={20} /> Com o Lojix
            </h3>
            {solutions.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
              >
                <s.icon size={20} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-gray-300">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
