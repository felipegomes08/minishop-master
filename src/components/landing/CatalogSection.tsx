import { Palette, Share2, Smartphone, MessageCircle } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

export default function CatalogSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-20 lg:py-28 bg-[#0a0e1a]">
      <div
        ref={ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual */}
          <div className="order-2 lg:order-1">
            <div className="max-w-xs mx-auto">
              <div className="rounded-[2rem] border-4 border-white/10 bg-[#111827] p-2 shadow-2xl">
                <div className="rounded-[1.5rem] bg-[#0f1729] overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">Minha Loja</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-3 p-2 rounded-lg bg-white/5">
                        <div className="w-16 h-16 rounded-lg bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-1.5 py-1">
                          <div className="h-3 w-3/4 rounded bg-white/10" />
                          <div className="h-2.5 w-1/2 rounded bg-white/5" />
                          <div className="h-3 w-1/3 rounded bg-violet-500/20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Catálogo Online Personalizável
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Sua vitrine digital com a cara da sua marca. Compartilhe pelo
              WhatsApp, Instagram ou link direto e venda de onde estiver.
            </p>
            <div className="space-y-4">
              {[
                { icon: Palette, text: "Personalize com suas cores, logo e identidade visual" },
                { icon: Smartphone, text: "Otimizado para celular — onde seus clientes estão" },
                { icon: MessageCircle, text: "Botão do WhatsApp integrado para fechar vendas rápido" },
                { icon: Share2, text: "Compartilhe o link do catálogo em qualquer canal" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <b.icon size={16} className="text-violet-400" />
                  </div>
                  <p className="text-gray-300">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
