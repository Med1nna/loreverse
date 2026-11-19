import { ArrowLeft, BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getHistoriaBySlug, getHistorias, getUniversoBySlug } from "../../lib/data";
import {
  estimateReadingMinutes,
  formatArchivalDate,
  formatOrdinal,
} from "../../lib/format";
import type { Historia, Universo } from "../../lib/types";
import { ArchivalImage } from "../components/ArchivalImage";
import { ArchiveStamp } from "../components/ArchiveStamp";
import { LoadingArchive } from "../components/LoadingArchive";
import { NotFoundView } from "../components/NotFoundView";

export function HistoriaPage() {
  const { slug, historiaSlug } = useParams<{ slug: string; historiaSlug: string }>();

  const [universo, setUniverso] = useState<Universo | null>(null);
  const [historia, setHistoria] = useState<Historia | null>(null);
  const [relatedHistorias, setRelatedHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;

    async function loadStory() {
      if (!slug || !historiaSlug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const [foundUniverso, foundHistoria] = await Promise.all([
          getUniversoBySlug(slug),
          getHistoriaBySlug(slug, historiaSlug),
        ]);
        if (!active) return;
        setUniverso(foundUniverso);
        setHistoria(foundHistoria);

        if (foundUniverso && foundHistoria) {
          const all = await getHistorias({ universo_id: foundUniverso.id });
          if (active) {
            setRelatedHistorias(all.filter((item) => item.id !== foundHistoria.id));
          }
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

    loadStory();
    return () => {
      active = false;
    };
  }, [slug, historiaSlug]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setReadProgress(0);
      } else {
        setReadProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const paragraphs = useMemo(() => {
    if (!historia) return [];
    return historia.conteudo
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [historia]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-12">
        <LoadingArchive message="Recuperando manuscrito do arquivo..." variant="article" />
      </div>
    );
  }

  if (errorMessage) {
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

  if (!universo || !historia) {
    return (
      <NotFoundView
        code="MANUSCRITO INEXISTENTE"
        title="Registro histórico não localizado"
        description="A crônica solicitada não foi encontrada neste universo ou pode ter sido removida pela equipe curatorial."
      />
    );
  }

  const readMins = estimateReadingMinutes(historia.conteudo);

  return (
    <>
      {/* Subtle hairline reading depth progress bar */}
      <div
        aria-hidden="true"
        className="fixed top-16 left-0 right-0 z-30 h-[2px] bg-[#161616]"
      >
        <div
          className="h-full bg-[#C5A059] transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${readProgress / 100})` }}
        />
      </div>

      <article className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Top Breadcrumb */}
        <div className="pt-5 pb-3 sm:pt-7 sm:pb-4 border-b border-[#987654]/25 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <nav
            aria-label="Caminho de navegação"
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.11em] text-[#726A5E] overflow-x-auto no-scrollbar max-w-full"
          >
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center text-[#B3A898] hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
            >
              Índice Geral
            </Link>
            <span aria-hidden="true" className="shrink-0">
              /
            </span>
            <Link
              to={`/universo/${universo.slug}`}
              className="min-h-[44px] inline-flex items-center text-[#B3A898] hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
            >
              {universo.nome}
            </Link>
            <span aria-hidden="true" className="shrink-0">
              /
            </span>
            <span className="text-[#C5A059] whitespace-nowrap truncate">
              {historia.titulo}
            </span>
          </nav>

          <Link
            to={`/universo/${universo.slug}`}
            className="hidden sm:inline-flex items-center gap-1.5 min-h-[44px] font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Voltar ao Dossiê</span>
          </Link>
        </div>

        {/* Asymmetric 12-Column Open Folio Layout (4 cols metadata rail / 8 cols manuscript) */}
        <div className="py-8 sm:py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left 4 Columns: Archival Metadata Rail */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 order-2 lg:order-1 min-w-0">
            <div className="relative pt-7">
              <div className="absolute top-0 left-0 h-7 max-w-[85%] pl-4 pr-6 bg-[#1C1A17] border border-b-0 border-[#987654]/40 dossier-tab flex items-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059] truncate">
                  FICHA CATALOGRÁFICA
                </span>
              </div>

              <div className="bg-[#161616] border border-[#987654]/35 p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-[#726A5E]">
                    STATUS DO DOCUMENTO
                  </span>
                  <ArchiveStamp label="CANÔNICO" tone="brass" tilt="right" />
                </div>

                <dl className="divide-y divide-[#1C1A17] border-t border-b border-[#1C1A17]">
                  <div className="py-3 flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] shrink-0">
                      Arquivo
                    </dt>
                    <dd className="font-mono text-xs text-[#C5A059] text-right">
                      {universo.codigo}
                    </dd>
                  </div>
                  <div className="py-3 flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] shrink-0">
                      Universo
                    </dt>
                    <dd className="font-serif text-sm text-[#E8DFD0] text-right min-w-0">
                      <Link
                        to={`/universo/${universo.slug}`}
                        className="hover:text-[#C5A059] transition-colors break-words"
                      >
                        {universo.nome}
                      </Link>
                    </dd>
                  </div>
                  <div className="py-3 flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] shrink-0">
                      Categoria
                    </dt>
                    <dd className="font-mono text-xs uppercase tracking-[0.1em] text-[#E8DFD0] text-right">
                      {historia.categoria}
                    </dd>
                  </div>
                  <div className="py-3 flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] shrink-0">
                      Catalogação
                    </dt>
                    <dd className="font-mono text-xs text-[#B3A898] tabular-nums text-right">
                      {formatArchivalDate(historia.created_at)}
                    </dd>
                  </div>
                  <div className="py-3 flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] shrink-0">
                      Leitura Estimada
                    </dt>
                    <dd className="font-mono text-xs text-[#B3A898] tabular-nums text-right inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#987654]" aria-hidden="true" />
                      <span>{readMins} min</span>
                    </dd>
                  </div>
                </dl>

                {/* Related stories index in the same universe */}
                {relatedHistorias.length > 0 && (
                  <div className="pt-2 space-y-3">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059]">
                      OUTROS REGISTROS EM {universo.nome}
                    </h2>
                    <ul className="divide-y divide-[#1C1A17]">
                      {relatedHistorias.map((rel, idx) => (
                        <li key={rel.id}>
                          <Link
                            to={`/universo/${universo.slug}/${rel.slug}`}
                            className="group min-h-[52px] py-3 flex items-center justify-between gap-3 hover:pl-1.5 transition-all"
                          >
                            <div className="min-w-0">
                              <span className="block font-display text-lg text-[#E8DFD0] group-hover:text-[#C5A059] transition-colors truncate">
                                {rel.titulo}
                              </span>
                              <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                                {rel.categoria}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-[#726A5E] tabular-nums shrink-0">
                              {formatOrdinal(idx)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right 8 Columns: Manuscript Reading Canvas */}
          <div className="lg:col-span-8 order-1 lg:order-2 min-w-0">
            <header className="space-y-4 sm:space-y-5">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#C5A059]">
                <span>{universo.codigo}</span>
                <span aria-hidden="true" className="text-[#726A5E]">
                  ·
                </span>
                <span>{historia.categoria}</span>
              </div>

              <h1 className="font-display text-[clamp(2.1rem,5.8vw,3.5rem)] leading-[1.12] tracking-[0.03em] text-[#E8DFD0] text-balance">
                {historia.titulo}
              </h1>

              <p className="font-serif italic text-[17px] sm:text-[19px] leading-[1.6] text-[#B3A898] max-w-[64ch]">
                {historia.resumo}
              </p>
            </header>

            {/* Cover Plate — keeps 16:9 aspect ratio on all screens */}
            <figure className="mt-7 sm:mt-8 mb-8 sm:mb-10">
              <ArchivalImage
                src={historia.imagem_capa_url}
                alt={historia.titulo}
                code={`${universo.codigo} · ${historia.categoria.toUpperCase()}`}
                aspectClassName="aspect-[16/9] w-full"
                priority
              />
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 font-serif italic text-xs text-[#726A5E]">
                <span>
                  Fig. 01 — Ilustração de acervo referente a {historia.titulo}.
                </span>
                <span className="font-mono not-italic text-[10px] uppercase tracking-[0.1em] break-all">
                  REF. {historia.slug.toUpperCase()}
                </span>
              </figcaption>
            </figure>

            <div className="divider-stitched mb-8 sm:mb-10" />

            {/* Chronicle Paragraphs — min 17px body size for comfortable reading */}
            <div className="w-full max-w-[68ch] space-y-6">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={`font-serif text-[17px] md:text-[18px] leading-[1.78] text-[#E8DFD0]/92 ${
                    index === 0 ? "archival-dropcap" : ""
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Closing Colophon */}
            <footer className="mt-12 sm:mt-14 pt-8 border-t border-[#987654]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#726A5E]">
                  FIM DO REGISTRO
                </span>
                <span className="mt-1 block font-serif italic text-sm text-[#B3A898]">
                  Preservado no dossiê {universo.codigo} — {universo.nome}.
                </span>
              </div>

              <Link
                to={`/universo/${universo.slug}`}
                className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-transparent border border-[#987654] text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retornar a {universo.nome}</span>
              </Link>
            </footer>
          </div>
        </div>
      </article>
    </>
  );
}
