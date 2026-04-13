import { Camera, Cpu, PackageCheck, Clock, ShieldCheck, Zap } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

export default function PhotoImporterSection() {
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
          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap size={14} /> IA
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Importador de Produtos por Foto
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Fotografou o pedido do fornecedor?{" "}
              <strong className="text-blue-300">O Lojix faz o resto.</strong> A IA
              lê nome, quantidade e valor dos produtos e cadastra tudo
              automaticamente.
            </p>

            <div className="space-y-4">
              {[
                { icon: Clock, text: "Economize horas por semana de digitação manual" },
                { icon: ShieldCheck, text: "Zero erros de digitação no cadastro" },
                { icon: PackageCheck, text: "Estoque atualizado instantaneamente" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <b.icon size={16} className="text-blue-400" />
                  </div>
                  <p className="text-gray-300">{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Camera size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Pedido_Fornecedor.jpg</p>
                <p className="text-xs text-gray-500">Processando com IA...</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: "Anel Solitário Ouro 18k", qty: 5, price: "R$ 890,00" },
                { name: "Brinco Argola Prata 925", qty: 12, price: "R$ 145,00" },
                { name: "Colar Riviera Zircônia", qty: 8, price: "R$ 320,00" },
              ].map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Cpu size={14} className="text-blue-400" />
                    <span className="text-sm text-gray-300">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Qtd: {p.qty}</span>
                    <span className="text-blue-300 font-medium">{p.price}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
              <PackageCheck size={16} />
              3 produtos importados com sucesso
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
