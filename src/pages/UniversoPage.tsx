import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getHistorias, getUniversoBySlug } from "../../lib/data";
import {
  estimateReadingMinutes,
  formatArchivalDate,
  formatOrdinal,
} from "../../lib/format";
import { CATEGORIAS, type Categoria, type Historia, type Universo } from "../../lib/types";
import { ArchivalImage } from "../components/ArchivalImage";
import { ArchiveStamp } from "../components/ArchiveStamp";
import { EmptyArchive } from "../components/EmptyArchive";
import { LoadingArchive } from "../components/LoadingArchive";
import { NotFoundView } from "../components/NotFoundView";

type CategoryFilter = "Todos" | Categoria;

export function UniversoPage() {
  const { slug } = useParams<{ slug: string }>();

  const [universo, setUniverso] = useState<Universo | null>(null);
  const [allUniverseHistorias, setAllUniverseHistorias] = useState<Historia[]>([]);
  const [filteredHistorias, setFilteredHistorias] = useState<Historia[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoryFilter>("Todos");
  const [loadingUniverso, setLoadingUniverso] = useState(true);
  const [loadingHistorias, setLoadingHistorias] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load universe + full count list when slug changes
  useEffect(() => {
    let active = true;
    async function loadUniverso() {
      if (!slug) {
        setUniverso(null);
        setLoadingUniverso(false);
        return;
      }
      setLoadingUniverso(true);
      setErrorMessage(null);
      setSelectedCategoria("Todos");
      try {
        const found = await getUniversoBySlug(slug);
        if (!active) return;
        setUniverso(found);
        if (found) {
          const allList = await getHistorias({ universo_id: found.id });
          if (!active) return;
          setAllUniverseHistorias(allList);
          setFilteredHistorias(allList);
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
        if (active) setLoadingUniverso(false);
      }
    }
    loadUniverso();
    return () => {
      active = false;
    };
  }, [slug]);

  // Query data layer with categoria filter when tab changes
  useEffect(() => {
    let active = true;
    async function loadFiltered() {
      if (!universo) return;
      setLoadingHistorias(true);
      setErrorMessage(null);
      try {
        const list = await getHistorias({
          universo_id: universo.id,
          categoria: selectedCategoria === "Todos" ? undefined : selectedCategoria,
        });
        if (active) setFilteredHistorias(list);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível acessar o arquivo. Tente novamente."
          );
        }
      } finally {
        if (active) setLoadingHistorias(false);
      }
    }
    if (universo) {
      loadFiltered();
    }
    return () => {
      active = false;
    };
  }, [universo, selectedCategoria]);

  const countsByCategoria = useMemo(() => {
    const map: Record<string, number> = { Todos: allUniverseHistorias.length };
    for (const cat of CATEGORIAS) {
      map[cat] = allUniverseHistorias.filter((h) => h.categoria === cat).length;
    }
    return map;
  }, [allUniverseHistorias]);

  if (loadingUniverso) {
    return (
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-12">
        <LoadingArchive message="Abrindo fichário do universo..." variant="grid" />
      </div>
    );
  }

  if (errorMessage && !universo) {
    return (
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-12">
        <div
          role="alert"
          className="bg-[#1C1A17] border border-[#DF6C4F]/80 p-6 sm:p-8 flex flex-col items-start gap-4"
        >
          <ArchiveStamp label="FALHA DE ACESSO" tone="terracotta" tilt="left" />
          <p className="font-serif text-[16px] text-[#FFB4A2]">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!universo) {
    return (
      <NotFoundView
        code="ARQUIVO INEXISTENTE"
        title="Universo não encontrado no catálogo"
        description="O universo solicitado não consta em nossa base arquivística ou teve seu registro removido pela curadoria."
      />
    );
  }

  const tabs: CategoryFilter[] = ["Todos", ...CATEGORIAS];

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
      {/* Breadcrumb bar */}
      <div className="pt-5 pb-3 sm:pt-7 sm:pb-4 flex items-center justify-between gap-4 border-b border-[#987654]/25">
        <nav
          aria-label="Caminho de navegação"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.11em] text-[#726A5E] overflow-x-auto no-scrollbar min-w-0"
        >
          <Link
            to="/"
            className="min-h-[44px] inline-flex items-center gap-1.5 text-[#B3A898] hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Índice Geral</span>
          </Link>
          <span aria-hidden="true" className="shrink-0">
            /
          </span>
          <span className="text-[#C5A059] whitespace-nowrap truncate">
            {universo.codigo} — {universo.nome}
          </span>
        </nav>

        <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] whitespace-nowrap shrink-0">
          CATALOGADO EM {formatArchivalDate(universo.created_at)}
        </span>
      </div>

      {/* Universe Hero — 12-column asymmetric split */}
      <section className="py-8 sm:py-10 lg:py-14 border-b border-[#987654]/35">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6 min-w-0">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[#C5A059]">
                  {universo.codigo}
                </span>
                <span aria-hidden="true" className="text-[#726A5E]">
                  ·
                </span>
                <ArchiveStamp label="ACERVO VERIFICADO" tone="brass" tilt="left" />
              </div>

              <h1 className="font-display text-[clamp(2.1rem,5.8vw,3.5rem)] leading-[1.12] tracking-[0.03em] text-[#E8DFD0] text-balance">
                {universo.nome}
              </h1>

              <p className="font-serif text-[16px] sm:text-[17px] lg:text-[18px] leading-[1.72] text-[#B3A898] max-w-[60ch]">
                {universo.descricao}
              </p>
            </div>

            <div className="pt-5 sm:pt-6 border-t border-dashed border-[#726A5E]/70 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                  Código de Arquivo
                </span>
                <span className="mt-1 block font-mono text-sm text-[#C5A059] tabular-nums">
                  {universo.codigo}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                  Total de Registros
                </span>
                <span className="mt-1 block font-mono text-sm text-[#E8DFD0] tabular-nums">
                  {String(allUniverseHistorias.length).padStart(2, "0")}{" "}
                  {allUniverseHistorias.length === 1 ? "crônica" : "crônicas"}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                  Identificador
                </span>
                <span className="mt-1 block font-mono text-sm text-[#B3A898] truncate">
                  /{universo.slug}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <ArchivalImage
              src={universo.imagem_url}
              alt={`Lâmina principal do universo ${universo.nome}`}
              code={universo.codigo}
              aspectClassName="h-[200px] sm:h-[290px] lg:h-full lg:min-h-[300px] w-full"
              priority
            />
            <p className="mt-2 font-serif italic text-xs text-[#726A5E]">
              Lâmina de referência — {universo.codigo}, arquivo {universo.nome}.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter Tabs — horizontally scrollable row with hidden scrollbar */}
      <section aria-label="Filtro por categoria" className="pt-8 sm:pt-10 pb-6 sm:pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-[#987654]/35">
          <div
            role="tablist"
            aria-label="Categorias do dossiê"
            className="flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 -mb-px"
          >
            {tabs.map((cat) => {
              const active = selectedCategoria === cat;
              const count = countsByCategoria[cat] ?? 0;
              return (
                <button
                  key={cat}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setSelectedCategoria(cat)}
                  className={`min-h-[44px] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.11em] border-t border-x transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                    active
                      ? "bg-[#1C1A17] text-[#C5A059] border-[#987654]/60 border-b border-b-[#1C1A17]"
                      : "bg-transparent text-[#B3A898] border-transparent hover:text-[#E8DFD0] hover:bg-[#161616]"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] tabular-nums ${
                      active ? "text-[#C5A059]" : "text-[#726A5E]"
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block pb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] whitespace-nowrap shrink-0">
            FILTRO ATIVO: <span className="text-[#E8DFD0]">{selectedCategoria}</span>
          </div>
        </div>
      </section>

      {/* Stories Dossier Grid: 1 col mobile (<640px), 2 cols tablet (640-1024px), 3 cols desktop (>1024px) */}
      <section aria-label="Registros do universo" className="pb-12">
        {loadingHistorias ? (
          <LoadingArchive message="Filtrando registros do dossiê..." variant="grid" />
        ) : errorMessage ? (
          <div
            role="alert"
            className="bg-[#1C1A17] border border-[#DF6C4F]/80 p-6 sm:p-8 flex flex-col items-start gap-4"
          >
            <ArchiveStamp label="FALHA DE ACESSO" tone="terracotta" tilt="left" />
            <p className="font-serif text-[16px] text-[#FFB4A2]">{errorMessage}</p>
          </div>
        ) : filteredHistorias.length === 0 ? (
          <EmptyArchive
            title="Nenhum registro encontrado neste arquivo."
            description={
              selectedCategoria !== "Todos"
                ? `Ainda não há crônicas catalogadas na categoria "${selectedCategoria}" para ${universo.nome}.`
                : `O arquivo de ${universo.nome} ainda não possui histórias cadastradas.`
            }
            action={
              selectedCategoria !== "Todos" ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategoria("Todos")}
                  className="min-h-[44px] px-5 py-2.5 bg-transparent border border-[#987654] text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
                >
                  Ver Todas as Categorias
                </button>
              ) : (
                <Link
                  to="/admin"
                  className="min-h-[44px] inline-flex items-center px-5 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors"
                >
                  Registrar Nova História
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredHistorias.map((historia, index) => {
              const readMins = estimateReadingMinutes(historia.conteudo);
              return (
                <article key={historia.id} className="group relative pt-7 flex flex-col min-w-0">
                  {/* Dossier File Tab */}
                  <div className="absolute top-0 left-0 h-7 max-w-[78%] pl-3.5 pr-6 bg-[#1C1A17] border border-b-0 border-[#987654]/35 group-hover:border-[#987654]/80 dossier-tab flex items-center transition-colors">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.11em] text-[#C5A059] truncate">
                      {historia.categoria}
                    </span>
                  </div>

                  <Link
                    to={`/universo/${universo.slug}/${historia.slug}`}
                    className="flex-1 flex flex-col bg-[#161616] border border-[#987654]/30 group-hover:border-[#987654]/80 transition-colors"
                  >
                    <div className="px-5 py-3 bg-[#1C1A17]/50 border-b border-[#987654]/25 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] truncate">
                        {formatArchivalDate(historia.created_at)} · {readMins} MIN
                      </span>
                      <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-[#726A5E] group-hover:text-[#C5A059] transition-colors tabular-nums shrink-0">
                        {formatOrdinal(index)}
                      </span>
                    </div>

                    <div className="p-5 pb-0">
                      <ArchivalImage
                        src={historia.imagem_capa_url}
                        alt={historia.titulo}
                        code={`${universo.codigo} · ${historia.categoria.toUpperCase()}`}
                        aspectClassName="aspect-[16/10]"
                      />
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h2 className="font-display text-[24px] sm:text-[26px] leading-[1.22] text-[#E8DFD0] group-hover:text-[#E9C176] transition-colors">
                        {historia.titulo}
                      </h2>

                      <p className="mt-3 font-serif text-[15px] leading-[1.65] text-[#B3A898] line-clamp-3 flex-1">
                        {historia.resumo}
                      </p>

                      <div className="my-5 divider-stitched" />

                      <div className="min-h-[32px] flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                          {universo.codigo}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.11em] text-[#C5A059] group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          <span>Ler Registro</span>
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
