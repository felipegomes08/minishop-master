import { ArrowRight } from "lucide-react";

export default function FinalCTASection() {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-[#0a0e1a] to-blue-900/40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Sua loja merece tecnologia de ponta.{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Comece hoje.
          </span>
        </h2>
        <p className="text-lg text-gray-400 mb-10">
          Sem fidelidade. Sem taxa de instalação. Configure em minutos e
          comece a vender mais com inteligência artificial.
        </p>
        <a
          href="#precos"
          className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-all hover:shadow-lg hover:shadow-violet-500/25"
        >
          Quero conhecer o Lojix
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </section>
  );
}
