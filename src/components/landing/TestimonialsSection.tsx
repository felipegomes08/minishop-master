import { Star } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

const testimonials = [
  {
    name: "Carla Mendes",
    role: "Dona da Bella Joias",
    city: "São Paulo, SP",
    text: "O experimentador virtual aumentou minhas vendas online em 35%. Minhas clientes adoram ver como a joia fica antes de comprar!",
    stars: 5,
  },
  {
    name: "Ricardo Alves",
    role: "Gestor da Street Shoes",
    city: "Belo Horizonte, MG",
    text: "Eu perdia horas cadastrando produtos. Com o importador por foto, faço em 2 minutos o que antes levava uma tarde inteira.",
    stars: 5,
  },
  {
    name: "Ana Paula Costa",
    role: "Proprietária da Charme Fashion",
    city: "Curitiba, PR",
    text: "Os insights de IA me mostraram que eu tinha 15 produtos parados há meses. Fiz uma promoção e recuperei o investimento.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
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
          Quem usa, recomenda
        </h2>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-16">
          Lojistas de todo o Brasil já transformaram seus negócios com o Lojix.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/20 transition-colors"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-semibold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.role} · {t.city}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
