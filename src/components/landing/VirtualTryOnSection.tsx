import { Camera, Sparkles, ShoppingBag, Undo2, TrendingUp, Heart } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

const steps = [
  { icon: Camera, title: "Tire uma foto", desc: "O cliente envia uma foto pelo celular" },
  { icon: Sparkles, title: "A IA processa", desc: "Seleciona a peça e a IA gera a imagem" },
  { icon: ShoppingBag, title: "Compra com confiança", desc: "Resultado realista pronto para decidir" },
];

const benefits = [
  { icon: Undo2, title: "Menos devoluções", desc: "Cliente vê como fica antes de comprar" },
  { icon: TrendingUp, title: "Mais conversões", desc: "Experiência única que gera vendas" },
  { icon: Heart, title: "Exclusivo no mercado", desc: "Destaque-se da concorrência com IA" },
];

export default function VirtualTryOnSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="ia" className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-[#0a0e1a] to-blue-950/80" />
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />

      <div
        ref={ref}
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Exclusivo
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Experimentador Virtual com IA
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Chega de <em>"será que vai me servir?"</em>. Agora seu cliente experimenta
            antes de comprar — <strong className="text-violet-300">sem sair de casa</strong>.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {steps.map((s, i) => (
            <div
              key={i}
              className="relative p-6 rounded-2xl bg-white/5 border border-white/10 text-center group hover:border-violet-500/30 transition-colors"
            >
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <s.icon size={28} className="text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <b.icon size={20} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">{b.title}</h4>
                <p className="text-sm text-gray-400">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
