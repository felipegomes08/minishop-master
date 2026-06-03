import lojixIcon from "@/assets/lojix_icon.png";

export default function LandingFooter() {
  return (
    <footer className="bg-[#060911] border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <a href="#" className="flex items-center">
              <img src={lojixIcon} alt="Lojix" className="h-7" />
            </a>
            <p className="text-sm text-gray-500 mt-1">
              Gestão inteligente para lojas que querem crescer.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">
              Termos de uso
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Contato
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Lojix. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
