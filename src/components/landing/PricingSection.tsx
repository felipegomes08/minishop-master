import { Check, X, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useScrollReveal } from "./useScrollReveal";
import { toast } from "sonner";

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  tier: "bronze" | "prata" | "ouro";
  price: string;
  popular?: boolean;
  features: Feature[];
}

const plans: Plan[] = [
  {
    name: "Bronze",
    tier: "bronze",
    price: "97",
    features: [
      { text: "1 usuário", included: true },
      { text: "Até 50 produtos cadastrados", included: true },
      { text: "Até 3 imagens por produto", included: true },
      { text: "Controle de estoque automático", included: true },
      { text: "Catálogo online simples", included: true },
      { text: "Suporte via WhatsApp", included: true },
      { text: "Gestão financeira com dashboards", included: false },
      { text: "Cupons e promoções", included: false },
      { text: "Gestão de clientes (CRM)", included: false },
      { text: "Importador de produtos por foto com IA", included: false },
      { text: "Insights de IA", included: false },
      { text: "Experimentador virtual com IA", included: false },
    ],
  },
  {
    name: "Prata",
    tier: "prata",
    price: "167",
    popular: true,
    features: [
      { text: "3 usuários", included: true },
      { text: "Até 100 produtos cadastrados", included: true },
      { text: "Até 6 imagens por produto", included: true },
      { text: "Controle de estoque automático", included: true },
      { text: "Catálogo online personalizável", included: true },
      { text: "Suporte via WhatsApp", included: true },
      { text: "Gestão financeira com dashboards", included: true },
      { text: "Cupons e promoções", included: true },
      { text: "Gestão de clientes (CRM)", included: true },
      { text: "Importador de produtos por foto com IA", included: true },
      { text: "Insights de IA", included: true },
      { text: "Experimentador virtual com IA", included: false },
    ],
  },
  {
    name: "Ouro",
    tier: "ouro",
    price: "249",
    features: [
      { text: "10 usuários", included: true },
      { text: "Produtos ilimitados", included: true },
      { text: "Até 10 imagens por produto", included: true },
      { text: "Tudo do plano Prata", included: true },
      { text: "Experimentador virtual com IA ✨", included: true },
      { text: "Insights de IA avançados", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
];

export default function PricingSection() {
  const { ref, isVisible } = useScrollReveal();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: "bronze" | "prata" | "ouro") => {
    setLoadingTier(tier);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan_tier: tier }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar checkout");
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar checkout";
      toast.error(msg);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <section id="precos" className="py-20 lg:py-28 bg-[#0a0e1a]">
      <div
        ref={ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
          Escolha o plano ideal para o seu momento
        </h2>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-16">
          Sem taxa de instalação. Cancele quando quiser.
        </p>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 lg:p-8 border transition-all ${
                plan.popular
                  ? "bg-violet-600/10 border-violet-500/40 scale-[1.02] shadow-lg shadow-violet-500/10"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-600 text-white text-xs font-semibold flex items-center gap-1">
                  <Crown size={12} /> Mais popular
                </div>
              )}

              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-sm text-gray-400">R$</span>
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-gray-400">/mês</span>
              </div>

              <button
                type="button"
                onClick={() => handleSubscribe(plan.tier)}
                disabled={loadingTier === plan.tier}
                className={`flex items-center justify-center gap-2 w-full text-center py-3 rounded-xl font-semibold transition-colors mb-8 disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.popular
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                {loadingTier === plan.tier ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Redirecionando...
                  </>
                ) : (
                  "Começar agora"
                )}
              </button>

              <ul className="space-y-3">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-gray-600 mt-0.5 shrink-0" />
                    )}
                    <span className={f.included ? "text-gray-300" : "text-gray-600"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
