import { Link } from "react-router-dom";
import { ArchiveStamp } from "./ArchiveStamp";

interface NotFoundViewProps {
  code?: string;
  title?: string;
  description?: string;
}

export function NotFoundView({
  code = "CÓDIGO 404",
  title = "Arquivo não localizado no acervo",
  description = "O dossiê, universo ou crônica solicitado foi removido, recatalogado ou jamais constou nos índices oficiais do LoreVerse.",
}: NotFoundViewProps) {
  return (
    <section className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-20 md:py-28">
      <div className="max-w-2xl mx-auto">
        <div className="relative pt-7">
          <div className="absolute top-0 left-0 h-7 max-w-[85%] pl-4 pr-6 bg-[#1C1A17] border border-b-0 border-[#987654]/45 dossier-tab flex items-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#DF6C4F] truncate">
              {code} — EXTRAVIO
            </span>
          </div>

          <div className="bg-[#161616] border border-[#987654]/40 p-6 sm:p-8 md:p-12">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#726A5E]">
                OCORRÊNCIA DE CATÁLOGO
              </span>
              <ArchiveStamp label="REGISTRO EXTRAVIADO" tone="terracotta" tilt="right" />
            </div>

            <h1 className="mt-6 font-display text-[clamp(2rem,5.5vw,3rem)] text-[#E8DFD0] leading-tight tracking-[0.02em] text-balance">
              {title}
            </h1>

            <div className="my-6 divider-stitched" />

            <p className="font-serif text-[16px] leading-[1.7] text-[#B3A898]">
              {description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
              <Link
                to="/"
                className="min-h-[44px] inline-flex items-center justify-center px-6 py-3 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
              >
                Retornar ao Índice Geral
              </Link>
              <Link
                to="/admin"
                className="min-h-[44px] inline-flex items-center justify-center px-5 py-3 bg-transparent text-[#E8DFD0] border border-[#987654]/70 font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors whitespace-nowrap shrink-0"
              >
                Abrir Curadoria
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
