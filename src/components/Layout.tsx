import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { getUniversos } from "../../lib/data";
import { formatOrdinal } from "../../lib/format";
import type { Universo } from "../../lib/types";
import { useAuth } from "../contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuredUniversos, setFeaturedUniversos] = useState<Universo[]>([]);

  useEffect(() => {
    let active = true;
    getUniversos()
      .then((list) => {
        if (active) setFeaturedUniversos(list.slice(0, 3));
      })
      .catch(() => {
        // Error already logged in data layer
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  // Close mobile overlay on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll and listen for Escape when full-screen menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "Índice Geral", to: "/" },
    ...featuredUniversos.map((u) => ({
      label: u.nome,
      to: `/universo/${u.slug}`,
    })),
  ];

  const authAction = user
    ? { label: "Painel", to: "/admin" }
    : { label: "Entrar", to: "/login" };

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0E0E0E] text-[#E8DFD0] overflow-x-clip">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-40 bg-[#0E0E0E] border-b border-[#987654]/35">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <Link
            to="/"
            className="inline-flex items-center min-h-[44px] font-display text-2xl tracking-[0.06em] text-[#E8DFD0] hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
          >
            LoreVerse
          </Link>

          {/* Zone 2: Clean single-line navigation links (Desktop >1024px) */}
          <nav
            aria-label="Navegação principal"
            className="hidden lg:flex items-center gap-7 min-w-0"
          >
            {navLinks.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center min-h-[44px] font-mono text-[11px] uppercase tracking-[0.11em] transition-colors whitespace-nowrap shrink-0 max-w-[180px] truncate border-b-2 ${
                    active
                      ? "text-[#C5A059] border-[#C5A059]"
                      : "text-[#B3A898] border-transparent hover:text-[#E8DFD0] hover:border-[#987654]/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Single Auth-Aware Primary Action + hamburger menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={authAction.to}
              className="hidden sm:inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
            >
              {authAction.label}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              aria-expanded={mobileMenuOpen}
              aria-controls="fullscreen-nav-overlay"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] border border-[#987654]/55 text-[#E8DFD0] hover:bg-[#1C1A17] hover:border-[#C5A059] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Ink-Black Archival Overlay Menu (Mobile & Tablet) */}
      {mobileMenuOpen && (
        <div
          id="fullscreen-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação em tela cheia"
          className="fixed inset-0 z-50 bg-[#0E0E0E] flex flex-col overflow-y-auto lg:hidden"
        >
          {/* Overlay Top Bar */}
          <div className="px-5 sm:px-8 h-16 border-b border-[#987654]/35 flex items-center justify-between gap-4 shrink-0">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center min-h-[44px] font-display text-2xl tracking-[0.06em] text-[#E8DFD0]"
            >
              LoreVerse
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu de navegação"
              className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] border border-[#987654]/55 text-[#E8DFD0] hover:border-[#C5A059] hover:text-[#C5A059] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Large Editorial Serif Links */}
          <div className="flex-1 flex flex-col justify-between px-5 sm:px-8 py-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C5A059] mb-4">
                ÍNDICE DE NAVEGAÇÃO
              </p>

              <nav
                aria-label="Navegação principal móvel"
                className="divide-y divide-[#987654]/25 border-t border-b border-[#987654]/25"
              >
                {navLinks.map((item, idx) => {
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`min-h-[56px] py-4 flex items-baseline justify-between gap-4 transition-colors ${
                        active
                          ? "text-[#C5A059]"
                          : "text-[#E8DFD0] hover:text-[#C5A059]"
                      }`}
                    >
                      <span className="font-display text-3xl sm:text-4xl leading-tight tracking-[0.02em]">
                        {item.label}
                      </span>
                      <span className="font-mono text-xs text-[#726A5E] tabular-nums shrink-0">
                        {formatOrdinal(idx)}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-8 space-y-4">
              <Link
                to={authAction.to}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[48px] inline-flex items-center justify-center px-6 py-3 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors"
              >
                {authAction.label}
              </Link>
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[#726A5E]">
                LOREVERSE · ARQUIVO HISTÓRICO EDITORIAL
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">{children}</main>

      {/* Quiet Museum Archival Footer */}
      <footer className="border-t border-[#987654]/30 bg-[#0E0E0E] mt-16 md:mt-20">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="font-display text-xl tracking-[0.05em] text-[#E8DFD0]">
              LoreVerse
            </span>
            <p className="mt-1 font-serif text-xs text-[#726A5E]">
              Arquivo Histórico Editorial de Mitologias e Crônicas Ficcionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.11em] text-[#726A5E]">
            <Link
              to="/"
              className="inline-flex items-center min-h-[44px] hover:text-[#C5A059] transition-colors"
            >
              Índice Geral
            </Link>
            <Link
              to={authAction.to}
              className="inline-flex items-center min-h-[44px] hover:text-[#C5A059] transition-colors"
            >
              {authAction.label}
            </Link>
            <span className="inline-flex items-center min-h-[44px] text-[#726A5E]/70">
              © {new Date().getFullYear()} LoreVerse
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
