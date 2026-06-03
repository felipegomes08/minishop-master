import lojixIcon from "@/assets/lojix_icon.png";
import { LogIn, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "IA", href: "#ia" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0e1a]/95 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <a href="#" className="flex items-center">
          <img src={lojixIcon} alt="Lojix" className="h-8" />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/auth"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <LogIn size={16} />
            Entrar
          </a>
          <a
            href="#precos"
            className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Começar grátis
          </a>
        </nav>

        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0a0e1a]/98 backdrop-blur-md border-t border-white/5 px-4 pb-4">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-3 text-gray-300 hover:text-white text-sm"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/auth"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 mt-2 py-3 text-gray-300 hover:text-white text-sm border-t border-white/10"
          >
            <LogIn size={16} />
            Entrar no sistema
          </a>
          <a
            href="#precos"
            onClick={() => setMobileOpen(false)}
            className="block mt-2 text-center px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium"
          >
            Começar grátis
          </a>
        </div>
      )}
    </header>
  );
}
