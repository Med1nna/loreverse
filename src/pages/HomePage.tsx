import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUniversos } from "../../lib/data";
import { formatArchivalDate, formatOrdinal } from "../../lib/format";
import type { Universo } from "../../lib/types";
import { ArchivalImage } from "../components/ArchivalImage";
import { ArchiveStamp } from "../components/ArchiveStamp";
import { EmptyArchive } from "../components/EmptyArchive";
import { LoadingArchive } from "../components/LoadingArchive";

export function HomePage() {
  const [universos, setUniversos] = useState<Universo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const univData = await getUniversos();
        if (active) {
          setUniversos(univData);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível acessar o arquivo. Tente novamente."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const totalHistorias = useMemo(
    () => universos.reduce((sum, u) => sum + (u.historias_count ?? 0), 0),
    [universos]
  );

  const filteredUniversos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return universos;
    return universos.filter((u) => u.nome.toLowerCase().includes(q));
  }, [universos, searchQuery]);

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
      {/* Editorial Archival Hero — 12-column asymmetric split */}
      <section className="pt-10 pb-10 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-16 border-b border-[#987654]/35">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left 4 columns: Catalog ledger & stamp */}
          <div className="lg:col-span-4 space-y-5 lg:space-y-6 lg:border-r lg:border-[#987654]/30 lg:pr-8">
            <div className="flex flex-wrap items-center justify-between gap-3 lg:block lg:space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#C5A059]">
                GABINETE DE PRESERVAÇÃO HISTÓRICA
              </p>
              <ArchiveStamp label="ACERVO CANÔNICO" tone="brass" tilt="left" />
            </div>

            <div className="divider-stitched hidden lg:block" />

            <dl className="grid grid-cols-2 lg:grid-cols-1 gap-4 pt-1">
              <div className="border-b border-[#1C1A17] pb-3 flex items-baseline justify-between gap-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                  Universos catalogados
                </dt>
                <dd className="font-mono text-lg text-[#E8DFD0] tabular-nums">
                  {loading ? "—" : String(universos.length).padStart(2, "0")}
                </dd>
              </div>
              <div className="border-b border-[#1C1A17] pb-3 flex items-baseline justify-between gap-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                  Registros preservados
                </dt>
                <dd className="font-mono text-lg text-[#C5A059] tabular-nums">
                  {loading ? "—" : String(totalHistorias).padStart(2, "0")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Right 8 columns: Main Display Title & Editorial Preface */}
          <div className="lg:col-span-8 space-y-5 sm:space-y-6 min-w-0">
            <h1 className="font-display text-[clamp(2rem,5.8vw,3.5rem)] leading-[1.15] tracking-[0.03em] text-[#E8DFD0] text-balance">
              Crônicas e Dossiês das Grandes Mitologias da Ficção
            </h1>
            <p className="font-serif text-[16px] sm:text-[17px] lg:text-[18px] leading-[1.7] text-[#B3A898] max-w-[64ch]">
              Cada universo reunido neste acervo é catalogado com rigor documental:
              personagens decisivos, eventos que moldaram eras inteiras e lugares
              preservados na memória das grandes narrativas. Selecione um fichário
              abaixo para consultar seus registros.
            </p>
          </div>
        </div>
      </section>

      {/* Card Catalog Search (Campo de Busca Catalográfica) */}
      <section aria-label="Pesquisa catalográfica" className="py-8 sm:py-10 lg:py-12">
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 border-b border-[#C5A059] pb-2">
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <label
              htmlFor="catalog-search"
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.11em] text-[#C5A059] sm:whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>ÍNDICE GERAL — PESQUISAR ARQUIVO:</span>
            </label>
            <input
              id="catalog-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome de um universo..."
              className="w-full min-h-[44px] bg-transparent font-serif italic text-[17px] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none py-2"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
            {searchQuery.trim() !== "" && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="min-h-[44px] inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#B3A898] hover:text-[#DF6C4F] transition-colors whitespace-nowrap cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Limpar filtro</span>
              </button>
            )}
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#726A5E] tabular-nums whitespace-nowrap py-2">
              {loading
                ? "CARREGANDO"
                : `${filteredUniversos.length} ${
                    filteredUniversos.length === 1 ? "ARQUIVO" : "ARQUIVOS"
                  }`}
            </span>
          </div>
        </div>
      </section>

      {/* Universos Dossier Grid: 1 col mobile (<640px), 2 cols tablet (640-1024px), 3 cols desktop (>1024px) */}
      <section aria-label="Catálogo de Universos" className="pb-12">
        {loading ? (
          <LoadingArchive message="Consultando fichário de universos..." variant="grid" />
        ) : errorMessage ? (
          <div
            role="alert"
            className="bg-[#1C1A17] border border-[#DF6C4F]/80 p-6 sm:p-8 flex flex-col items-start gap-4"
          >
            <ArchiveStamp label="FALHA DE ACESSO" tone="terracotta" tilt="left" />
            <p className="font-serif text-[16px] text-[#FFB4A2]">{errorMessage}</p>
          </div>
        ) : filteredUniversos.length === 0 ? (
          <EmptyArchive
            title="Nenhum registro encontrado neste arquivo."
            description={
              searchQuery.trim()
                ? `Não há universos correspondentes à consulta "${searchQuery}".`
                : "Nenhum universo foi catalogado até o momento."
            }
            action={
              searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="min-h-[44px] px-5 py-2.5 bg-transparent border border-[#987654] text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
                >
                  Exibir Todos os Arquivos
                </button>
              ) : (
                <Link
                  to="/admin"
                  className="min-h-[44px] inline-flex items-center px-5 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors"
                >
                  Catalogar Primeiro Universo
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredUniversos.map((universo, index) => {
              const count = universo.historias_count ?? 0;
              return (
                <article key={universo.id} className="group relative pt-7 flex flex-col min-w-0">
                  {/* Protruding Dossier File Tab */}
                  <div className="absolute top-0 left-0 h-7 max-w-[85%] pl-3.5 pr-6 bg-[#1C1A17] border border-b-0 border-[#987654]/35 group-hover:border-[#987654]/80 dossier-tab flex items-center transition-colors">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.11em] text-[#C5A059] truncate">
                      {universo.codigo} — {universo.nome}
                    </span>
                  </div>

                  {/* Main Dossier Card Body */}
                  <Link
                    to={`/universo/${universo.slug}`}
                    className="flex-1 flex flex-col bg-[#161616] border border-[#987654]/30 group-hover:border-[#987654]/80 transition-colors"
                  >
                    {/* Top Index Header */}
                    <div className="px-5 py-3 bg-[#1C1A17]/60 border-b border-[#987654]/25 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                        REG. {formatArchivalDate(universo.created_at)}
                      </span>
                      <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-[#726A5E] group-hover:text-[#C5A059] transition-colors tabular-nums">
                        {formatOrdinal(index)}
                      </span>
                    </div>

                    {/* Visual Plate */}
                    <div className="p-5 pb-0">
                      <ArchivalImage
                        src={universo.imagem_url}
                        alt={universo.nome}
                        code={universo.codigo}
                        aspectClassName="aspect-[16/10]"
                        priority={index < 3}
                      />
                    </div>

                    {/* Textual Body */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h2 className="font-display text-[26px] sm:text-[28px] leading-[1.2] tracking-[0.01em] text-[#E8DFD0] group-hover:text-[#E9C176] transition-colors">
                        {universo.nome}
                      </h2>

                      <p className="mt-3 font-serif text-[15px] leading-[1.65] text-[#B3A898] line-clamp-3 flex-1">
                        {universo.descricao}
                      </p>

                      <div className="my-5 divider-stitched" />

                      <div className="min-h-[32px] flex items-center justify-between gap-4">
                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#B3A898] tabular-nums">
                          {count} {count === 1 ? "registro" : "registros"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.11em] text-[#C5A059] group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          <span>Abrir Dossiê</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
