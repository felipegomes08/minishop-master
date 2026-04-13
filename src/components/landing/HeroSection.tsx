import { ArrowRight, BarChart3, Package, ShoppingBag, Users } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* BG */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-blue-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Já usado por lojistas em todo o Brasil
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight max-w-4xl mx-auto">
          Gerencie sua loja com{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            inteligência artificial
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
          Sistema completo de gestão com IA integrada para lojas de moda, joias,
          calçados e acessórios. Venda mais, trabalhe menos.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#precos"
            className="group px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 flex items-center gap-2"
          >
            Quero conhecer o Lojix
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#funcionalidades"
            className="px-8 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/25 font-medium transition-all"
          >
            Ver funcionalidades
          </a>
        </div>

        {/* Mockup */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-1 shadow-2xl shadow-violet-500/5">
            <div className="rounded-xl bg-[#0f1729] p-4 sm:p-6">
              {/* Top bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="ml-4 flex-1 h-6 rounded-md bg-white/5" />
              </div>
              {/* Content grid */}
              <div className="grid grid-cols-4 gap-3">
                {/* Sidebar */}
                <div className="hidden sm:block col-span-1 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-8 rounded-lg ${
                        i === 0 ? "bg-violet-500/20" : "bg-white/5"
                      }`}
                    />
                  ))}
                </div>
                {/* Main */}
                <div className="col-span-4 sm:col-span-3 space-y-3">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { icon: ShoppingBag, label: "Vendas", val: "R$ 12.450" },
                      { icon: Package, label: "Produtos", val: "156" },
                      { icon: Users, label: "Clientes", val: "89" },
                      { icon: BarChart3, label: "Crescimento", val: "+23%" },
                    ].map((k) => (
                      <div
                        key={k.label}
                        className="p-3 rounded-lg bg-white/5 border border-white/5"
                      >
                        <k.icon size={16} className="text-violet-400 mb-1" />
                        <p className="text-[10px] text-gray-500">{k.label}</p>
                        <p className="text-sm font-semibold text-white">{k.val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-32 rounded-lg bg-white/5 border border-white/5" />
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 rounded-lg bg-white/5 border border-white/5" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
