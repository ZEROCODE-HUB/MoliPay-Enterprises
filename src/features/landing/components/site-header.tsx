import { useEffect,useState } from "react";
import { MollyLogo } from "@/shared/ui/molly-logo";
import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled
    ? "bg-white/85 backdrop-blur-[12px] border-b border-black-100"
    : "bg-transparent";
  const text = scrolled ? "text-black-800" : "text-white/90";
  const outline = scrolled
    ? "border-black-200 text-black-700 hover:bg-black-50"
    : "border-white/40 text-white hover:bg-white/10";

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${solid}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
        <MollyLogo size={32} />
        <nav
          className={`hidden md:flex items-center gap-8 lg:gap-10 font-sans text-[0.975rem] font-medium ${text}`}
        >
          <a href="#servicios" className="hover:text-red-500 transition-colors">
            Servicios
          </a>
          <a href="#nosotros" className="hover:text-red-500 transition-colors">
            Nosotros
          </a>
          <a href="#contacto" className="hover:text-red-500 transition-colors">
            Contacto
          </a>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/login"
            search={{ register: undefined }}
            className={`hidden md:inline-flex h-10 items-center px-4 rounded-sm text-sm font-medium border transition-colors ${outline}`}
          >
            Iniciá sesión
          </Link>
          <Link
            to="/login"
            search={{ register: "pf" }}
            className={`hidden sm:inline-flex h-10 items-center px-4 rounded-sm text-sm font-medium border transition-colors ${outline}`}
          >
            Registrate
          </Link>
          <Link
            to="/login"
            search={{ register: "pj" }}
            className="inline-flex h-9 sm:h-10 items-center px-3 sm:px-4 rounded-sm text-sm font-medium text-white bg-red-500 hover:bg-red-400 transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Registrá tu empresa</span>
            <span className="sm:hidden">Registrar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
