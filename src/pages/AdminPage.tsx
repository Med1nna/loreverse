import {
  BookMarked,
  ExternalLink,
  FolderArchive,
  LogOut,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "../../lib/auth";
import {
  createHistoria,
  createUniverso,
  deleteHistoria,
  deleteUniverso,
  getHistorias,
  getUniversos,
  updateHistoria,
  updateUniverso,
} from "../../lib/data";
import { formatArchivalDate } from "../../lib/format";
import {
  CATEGORIAS,
  type Categoria,
  type CreateHistoriaInput,
  type CreateUniversoInput,
  type Historia,
  type Universo,
} from "../../lib/types";
import { ArchiveStamp } from "../components/ArchiveStamp";
import { EmptyArchive } from "../components/EmptyArchive";
import { LoadingArchive } from "../components/LoadingArchive";
import { ConfirmDeleteModal } from "../components/admin/ConfirmDeleteModal";
import { GerarUniversoModal } from "../components/admin/GerarUniversoModal";
import { HistoriaModal } from "../components/admin/HistoriaModal";
import { UniversoModal } from "../components/admin/UniversoModal";
import { useAuth } from "../contexts/AuthContext";

type AdminTab = "historias" | "universos";

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("historias");
  const [universos, setUniversos] = useState<Universo[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters for Histórias table
  const [filterUniversoId, setFilterUniversoId] = useState<string>("todos");
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");

  // Feedback & error banners
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modals state
  const [universoModalOpen, setUniversoModalOpen] = useState(false);
  const [editingUniverso, setEditingUniverso] = useState<Universo | null>(null);
  const [gerarUniversoModalOpen, setGerarUniversoModalOpen] = useState(false);

  const [historiaModalOpen, setHistoriaModalOpen] = useState(false);
  const [editingHistoria, setEditingHistoria] = useState<Historia | null>(null);

  const [deletingUniverso, setDeletingUniverso] = useState<Universo | null>(null);
  const [deletingHistoria, setDeletingHistoria] = useState<Historia | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [univData, histData] = await Promise.all([
        getUniversos(),
        getHistorias(),
      ]);
      setUniversos(univData);
      setHistorias(histData);
    } catch (error) {
      setErrorBanner(
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o arquivo. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const universoById = useMemo(() => {
    const map: Record<string, Universo> = {};
    for (const u of universos) {
      map[u.id] = u;
    }
    return map;
  }, [universos]);

  const storyCountByUniverso = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of historias) {
      counts[h.universo_id] = (counts[h.universo_id] ?? 0) + 1;
    }
    return counts;
  }, [historias]);

  const visibleHistorias = useMemo(() => {
    return historias.filter((h) => {
      if (filterUniversoId !== "todos" && h.universo_id !== filterUniversoId) {
        return false;
      }
      if (filterCategoria !== "todas" && h.categoria !== (filterCategoria as Categoria)) {
        return false;
      }
      return true;
    });
  }, [historias, filterUniversoId, filterCategoria]);

  // CRUD Handlers — Universos
  const handleSaveUniverso = async (values: CreateUniversoInput) => {
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingUniverso) {
        await updateUniverso(editingUniverso.id, values);
        setFeedback(`Universo "${values.nome}" atualizado no catálogo.`);
      } else {
        const created = await createUniverso(values);
        setFeedback(
          `Universo "${created.nome}" catalogado sob o código ${created.codigo}.`
        );
      }
      setUniversoModalOpen(false);
      setEditingUniverso(null);
      await loadAll();
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o arquivo. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteUniverso = async () => {
    if (!deletingUniverso) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const name = deletingUniverso.nome;
      await deleteUniverso(deletingUniverso.id);
      setDeletingUniverso(null);
      if (filterUniversoId === deletingUniverso.id) {
        setFilterUniversoId("todos");
      }
      setFeedback(`Universo "${name}" e seus registros vinculados foram removidos.`);
      await loadAll();
    } catch (error) {
      setDeletingUniverso(null);
      setErrorBanner(
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o arquivo. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handlers — Histórias
  const handleSaveHistoria = async (values: CreateHistoriaInput) => {
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingHistoria) {
        await updateHistoria(editingHistoria.id, values);
        setFeedback(`Registro "${values.titulo}" atualizado com sucesso.`);
      } else {
        await createHistoria(values);
        setFeedback(`Novo registro "${values.titulo}" incorporado ao acervo.`);
      }
      setHistoriaModalOpen(false);
      setEditingHistoria(null);
      await loadAll();
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o arquivo. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteHistoria = async () => {
    if (!deletingHistoria) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const title = deletingHistoria.titulo;
      await deleteHistoria(deletingHistoria.id);
      setDeletingHistoria(null);
      setFeedback(`Registro "${title}" removido do arquivo.`);
      await loadAll();
    } catch (error) {
      setDeletingHistoria(null);
      setErrorBanner(
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o arquivo. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setErrorBanner(null);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      setErrorBanner(
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o arquivo. Tente novamente."
      );
    } finally {
      setSigningOut(false);
    }
  };

  const linkedStoriesCountForDelete = deletingUniverso
    ? (storyCountByUniverso[deletingUniverso.id] ?? 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#E8DFD0] flex flex-col lg:flex-row overflow-x-clip">
      {/* Sidebar on Desktop (>1024px) / Top Header + Tab Bar on Mobile & Tablet (<=1024px) */}
      <aside className="sticky top-0 z-30 lg:static w-full lg:w-[272px] shrink-0 bg-[#161616] border-b lg:border-b-0 lg:border-r border-[#987654]/35 flex flex-col">
        <div className="px-5 sm:px-8 lg:px-6 h-16 lg:h-auto lg:py-5 border-b border-[#987654]/30 flex items-center justify-between gap-3 lg:block">
          <div className="min-w-0">
            <Link
              to="/"
              className="inline-flex items-center min-h-[44px] lg:min-h-0 font-display text-2xl tracking-[0.06em] text-[#E8DFD0] hover:text-[#C5A059] transition-colors"
            >
              LoreVerse
            </Link>
            <p className="hidden lg:block mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059]">
              PAINEL CURATORIAL
            </p>
          </div>

          <div className="flex items-center gap-2 lg:hidden shrink-0">
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.11em] text-[#E8DFD0] border border-[#987654]/50 px-3 py-2 hover:bg-[#1C1A17] transition-colors whitespace-nowrap"
            >
              <span>Acervo</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 border border-[#DF6C4F]/50 font-mono text-[10px] uppercase tracking-[0.11em] text-[#DF6C4F] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Discreet Archivist Identity Strip on Mobile & Tablet */}
        {user?.email && (
          <div className="lg:hidden px-5 sm:px-8 py-2 bg-[#131313] border-b border-[#987654]/20">
            <p className="font-mono text-[10px] text-[#726A5E] truncate">
              Arquivista: <span className="text-[#B3A898]">{user.email}</span>
            </p>
          </div>
        )}

        {/* Navigation Tabs: Top tab bar on mobile/tablet, vertical sidebar tabs on desktop */}
        <nav
          aria-label="Seções administrativas"
          className="grid grid-cols-2 lg:flex lg:flex-col lg:p-4 lg:gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveTab("universos")}
            className={`min-h-[48px] flex items-center justify-center lg:justify-between gap-2.5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.11em] transition-colors cursor-pointer whitespace-nowrap border-b-2 lg:border ${
              activeTab === "universos"
                ? "bg-[#1C1A17] text-[#C5A059] border-b-[#C5A059] lg:border-[#C5A059]"
                : "bg-transparent text-[#B3A898] border-b-transparent lg:border-transparent hover:bg-[#1C1A17]/50 hover:text-[#E8DFD0]"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FolderArchive className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Universos</span>
            </span>
            <span className="tabular-nums text-[10px] text-[#726A5E]">
              {String(universos.length).padStart(2, "0")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("historias")}
            className={`min-h-[48px] flex items-center justify-center lg:justify-between gap-2.5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.11em] transition-colors cursor-pointer whitespace-nowrap border-b-2 border-l border-l-[#987654]/20 lg:border-l-0 lg:border ${
              activeTab === "historias"
                ? "bg-[#1C1A17] text-[#C5A059] border-b-[#C5A059] lg:border-[#C5A059]"
                : "bg-transparent text-[#B3A898] border-b-transparent lg:border-transparent hover:bg-[#1C1A17]/50 hover:text-[#E8DFD0]"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <BookMarked className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Histórias</span>
            </span>
            <span className="tabular-nums text-[10px] text-[#726A5E]">
              {String(historias.length).padStart(2, "0")}
            </span>
          </button>
        </nav>

        {/* Sidebar Bottom Links & Archivist Info (Desktop only) */}
        <div className="hidden lg:flex flex-col gap-2 mt-auto p-4 border-t border-[#987654]/25">
          <div className="px-2 pb-2 space-y-3">
            <ArchiveStamp label="CURADORIA ATIVA" tone="brass" tilt="left" />
            {user?.email && (
              <p
                className="font-mono text-[11px] text-[#726A5E] break-all leading-relaxed"
                title={`Arquivista: ${user.email}`}
              >
                Arquivista:{" "}
                <span className="text-[#B3A898]">{user.email}</span>
              </p>
            )}
          </div>
          <Link
            to="/"
            className="min-h-[44px] flex items-center justify-between px-4 py-2.5 border border-[#987654]/40 font-mono text-[11px] uppercase tracking-[0.11em] text-[#E8DFD0] hover:bg-[#1C1A17] transition-colors"
          >
            <span>Ver Acervo Público</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="min-h-[44px] w-full flex items-center justify-between px-4 py-2.5 border border-transparent hover:border-[#DF6C4F]/50 font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] hover:text-[#DF6C4F] transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{signingOut ? "Saindo..." : "Sair"}</span>
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-7 sm:py-9 lg:py-12">
          {/* Error notice strip */}
          {errorBanner && (
            <div
              role="alert"
              className="mb-6 px-4 sm:px-5 py-3.5 bg-[#1C1A17] border border-[#DF6C4F]/80 flex items-center justify-between gap-4"
            >
              <span className="font-serif text-sm text-[#FFB4A2]">{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="min-h-[44px] px-2 inline-flex items-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#DF6C4F] hover:underline cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Feedback confirmation strip */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 px-4 sm:px-5 py-3 bg-[#1C1A17] border border-[#C5A059] flex items-center justify-between gap-4"
            >
              <span className="font-mono text-xs text-[#E8DFD0]">{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="min-h-[44px] px-2 inline-flex items-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#C5A059] hover:underline cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          )}

          {/* TAB: HISTÓRIAS */}
          {activeTab === "historias" && (
            <section aria-labelledby="admin-historias-heading" className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#987654]/35 pb-5 sm:pb-6">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059]">
                    GESTÃO DE CRÔNICAS E DOSSIÊS
                  </span>
                  <h1
                    id="admin-historias-heading"
                    className="mt-1 font-display text-[clamp(1.85rem,5vw,2.5rem)] leading-tight text-[#E8DFD0]"
                  >
                    Histórias Catalogadas
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingHistoria(null);
                    setHistoriaModalOpen(true);
                  }}
                  disabled={universos.length === 0}
                  className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Novo Registro</span>
                </button>
              </div>

              {/* Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#161616] border border-[#987654]/30 p-4">
                <div>
                  <label
                    htmlFor="filter-univ"
                    className="block font-mono text-[10px] uppercase tracking-[0.11em] text-[#726A5E] mb-1.5"
                  >
                    Filtrar por Universo
                  </label>
                  <select
                    id="filter-univ"
                    value={filterUniversoId}
                    onChange={(e) => setFilterUniversoId(e.target.value)}
                    className="w-full min-h-[44px] bg-[#0E0E0E] border border-[#987654]/40 px-3 py-2 font-serif text-[15px] text-[#E8DFD0] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="todos">Todos os universos</option>
                    {universos.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.codigo} — {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-cat"
                    className="block font-mono text-[10px] uppercase tracking-[0.11em] text-[#726A5E] mb-1.5"
                  >
                    Filtrar por Categoria
                  </label>
                  <select
                    id="filter-cat"
                    value={filterCategoria}
                    onChange={(e) => setFilterCategoria(e.target.value)}
                    className="w-full min-h-[44px] bg-[#0E0E0E] border border-[#987654]/40 px-3 py-2 font-serif text-[15px] text-[#E8DFD0] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="todas">Todas as categorias</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center lg:items-end justify-between sm:col-span-2 lg:col-span-1 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#1C1A17]">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#726A5E] tabular-nums py-2">
                    Exibindo {visibleHistorias.length} de {historias.length}
                  </span>
                  {(filterUniversoId !== "todos" || filterCategoria !== "todas") && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterUniversoId("todos");
                        setFilterCategoria("todas");
                      }}
                      className="min-h-[44px] px-2 inline-flex items-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#C5A059] hover:underline cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Histórias Content */}
              {loading ? (
                <LoadingArchive message="Carregando tabela de registros..." variant="table" />
              ) : visibleHistorias.length === 0 ? (
                <EmptyArchive
                  title="Nenhum registro encontrado neste arquivo."
                  description={
                    universos.length === 0
                      ? "Cadastre ao menos um universo na aba Universos antes de registrar histórias."
                      : "Nenhum registro corresponde aos filtros selecionados."
                  }
                />
              ) : (
                <>
                  {/* Mobile & Tablet Stacked Cards (<=1024px) */}
                  <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleHistorias.map((historia) => {
                      const univ = universoById[historia.universo_id];
                      return (
                        <article
                          key={historia.id}
                          className="bg-[#161616] border border-[#987654]/35 p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1C1A17]">
                              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059]">
                                {historia.categoria}
                              </span>
                              <span className="font-mono text-[10px] text-[#726A5E] tabular-nums">
                                {formatArchivalDate(historia.created_at)}
                              </span>
                            </div>

                            <div>
                              <span className="block font-mono text-[9px] uppercase tracking-[0.11em] text-[#726A5E]">
                                Título
                              </span>
                              {univ ? (
                                <Link
                                  to={`/universo/${univ.slug}/${historia.slug}`}
                                  className="mt-0.5 font-display text-2xl leading-snug text-[#E8DFD0] hover:text-[#C5A059] transition-colors block"
                                >
                                  {historia.titulo}
                                </Link>
                              ) : (
                                <span className="mt-0.5 font-display text-2xl leading-snug text-[#E8DFD0] block">
                                  {historia.titulo}
                                </span>
                              )}
                            </div>

                            <dl className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-[#726A5E]/50">
                              <div className="min-w-0">
                                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#726A5E]">
                                  Universo
                                </dt>
                                <dd className="mt-0.5 font-serif text-sm text-[#E8DFD0] truncate">
                                  {univ ? univ.nome : "—"}
                                </dd>
                                {univ && (
                                  <dd className="font-mono text-[10px] text-[#C5A059]">
                                    {univ.codigo}
                                  </dd>
                                )}
                              </div>
                              <div>
                                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#726A5E]">
                                  Categoria / Data
                                </dt>
                                <dd className="mt-0.5 font-mono text-[11px] uppercase text-[#B3A898]">
                                  {historia.categoria}
                                </dd>
                                <dd className="font-mono text-[10px] text-[#726A5E] tabular-nums">
                                  {formatArchivalDate(historia.created_at)}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <div className="pt-3 border-t border-[#1C1A17] grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHistoria(historia);
                                setHistoriaModalOpen(true);
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-[#987654]/55 text-[#E8DFD0] font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-[#1C1A17] hover:border-[#C5A059] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingHistoria(historia)}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-[#DF6C4F]/60 text-[#DF6C4F] font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Desktop Archival Data Table (>1024px) */}
                  <div className="hidden lg:block bg-[#161616] border border-[#987654]/35 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1C1A17] border-b border-[#987654]/35">
                          <th className="py-3.5 px-5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Título
                          </th>
                          <th className="py-3.5 px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Universo
                          </th>
                          <th className="py-3.5 px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Categoria
                          </th>
                          <th className="py-3.5 px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Data
                          </th>
                          <th className="py-3.5 px-5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059] text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleHistorias.map((historia) => {
                          const univ = universoById[historia.universo_id];
                          return (
                            <tr
                              key={historia.id}
                              className="border-b border-[#1C1A17] last:border-b-0 hover:bg-[#1C1A17]/60 transition-colors group"
                            >
                              <td className="py-4 px-5 border-l-2 border-l-transparent group-hover:border-l-[#C5A059] transition-colors">
                                {univ ? (
                                  <Link
                                    to={`/universo/${univ.slug}/${historia.slug}`}
                                    className="font-display text-xl text-[#E8DFD0] hover:text-[#C5A059] transition-colors block"
                                  >
                                    {historia.titulo}
                                  </Link>
                                ) : (
                                  <span className="font-display text-xl text-[#E8DFD0] block">
                                    {historia.titulo}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-[#726A5E]">
                                  /{historia.slug}
                                </span>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap">
                                {univ ? (
                                  <div>
                                    <span className="block font-serif text-sm text-[#E8DFD0]">
                                      {univ.nome}
                                    </span>
                                    <span className="block font-mono text-[10px] text-[#C5A059]">
                                      {univ.codigo}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs text-[#726A5E]">—</span>
                                )}
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#B3A898]">
                                  {historia.categoria}
                                </span>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap font-mono text-[11px] text-[#726A5E] tabular-nums">
                                {formatArchivalDate(historia.created_at)}
                              </td>
                              <td className="py-4 px-5 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingHistoria(historia);
                                      setHistoriaModalOpen(true);
                                    }}
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#987654]/55 text-[#E8DFD0] font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-[#1C1A17] hover:border-[#C5A059] transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingHistoria(historia)}
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#DF6C4F]/60 text-[#DF6C4F] font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          {/* TAB: UNIVERSOS */}
          {activeTab === "universos" && (
            <section aria-labelledby="admin-universos-heading" className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#987654]/35 pb-5 sm:pb-6">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059]">
                    CATÁLOGO DE ACERVOS
                  </span>
                  <h1
                    id="admin-universos-heading"
                    className="mt-1 font-display text-[clamp(1.85rem,5vw,2.5rem)] leading-tight text-[#E8DFD0]"
                  >
                    Universos Registrados
                  </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setGerarUniversoModalOpen(true)}
                    className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-transparent text-[#C5A059] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-[#C5A059] hover:text-[#0E0E0E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>✦ Gerar universo com IA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingUniverso(null);
                      setUniversoModalOpen(true);
                    }}
                    className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Novo Universo</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <LoadingArchive message="Carregando catálogo de universos..." variant="table" />
              ) : universos.length === 0 ? (
                <EmptyArchive
                  title="Nenhum registro encontrado neste arquivo."
                  description="Inicie o acervo cadastrando o primeiro universo fictício."
                />
              ) : (
                <>
                  {/* Mobile & Tablet Stacked Cards (<=1024px) */}
                  <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {universos.map((universo) => {
                      const count = storyCountByUniverso[universo.id] ?? 0;
                      return (
                        <article
                          key={universo.id}
                          className="bg-[#161616] border border-[#987654]/35 p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1C1A17]">
                              <span className="font-mono text-xs text-[#C5A059] tabular-nums">
                                {universo.codigo}
                              </span>
                              <span className="font-mono text-[10px] text-[#726A5E] tabular-nums">
                                {formatArchivalDate(universo.created_at)}
                              </span>
                            </div>

                            <div>
                              <Link
                                to={`/universo/${universo.slug}`}
                                className="font-display text-2xl leading-snug text-[#E8DFD0] hover:text-[#C5A059] transition-colors block"
                              >
                                {universo.nome}
                              </Link>
                              <span className="font-mono text-[10px] text-[#726A5E] break-all">
                                /universo/{universo.slug}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-dashed border-[#726A5E]/50 flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E]">
                                Registros vinculados
                              </span>
                              <span className="font-mono text-xs text-[#E8DFD0] tabular-nums">
                                {String(count).padStart(2, "0")}{" "}
                                {count === 1 ? "história" : "histórias"}
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#1C1A17] grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUniverso(universo);
                                setUniversoModalOpen(true);
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-[#987654]/55 text-[#E8DFD0] font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-[#1C1A17] hover:border-[#C5A059] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUniverso(universo)}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-[#DF6C4F]/60 text-[#DF6C4F] font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Desktop Archival Data Table (>1024px) */}
                  <div className="hidden lg:block bg-[#161616] border border-[#987654]/35 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1C1A17] border-b border-[#987654]/35">
                          <th className="py-3.5 px-5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Código
                          </th>
                          <th className="py-3.5 px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Universo
                          </th>
                          <th className="py-3.5 px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Registros
                          </th>
                          <th className="py-3.5 px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059]">
                            Catalogação
                          </th>
                          <th className="py-3.5 px-5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#C5A059] text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {universos.map((universo) => {
                          const count = storyCountByUniverso[universo.id] ?? 0;
                          return (
                            <tr
                              key={universo.id}
                              className="border-b border-[#1C1A17] last:border-b-0 hover:bg-[#1C1A17]/60 transition-colors group"
                            >
                              <td className="py-4 px-5 whitespace-nowrap border-l-2 border-l-transparent group-hover:border-l-[#C5A059] transition-colors font-mono text-xs text-[#C5A059] tabular-nums">
                                {universo.codigo}
                              </td>
                              <td className="py-4 px-4">
                                <Link
                                  to={`/universo/${universo.slug}`}
                                  className="font-display text-xl text-[#E8DFD0] hover:text-[#C5A059] transition-colors block"
                                >
                                  {universo.nome}
                                </Link>
                                <span className="font-mono text-[10px] text-[#726A5E]">
                                  /universo/{universo.slug}
                                </span>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap font-mono text-xs text-[#B3A898] tabular-nums">
                                {String(count).padStart(2, "0")}{" "}
                                {count === 1 ? "história" : "histórias"}
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap font-mono text-[11px] text-[#726A5E] tabular-nums">
                                {formatArchivalDate(universo.created_at)}
                              </td>
                              <td className="py-4 px-5 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUniverso(universo);
                                      setUniversoModalOpen(true);
                                    }}
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#987654]/55 text-[#E8DFD0] font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-[#1C1A17] hover:border-[#C5A059] transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingUniverso(universo)}
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#DF6C4F]/60 text-[#DF6C4F] font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Modals */}
      <GerarUniversoModal
        open={gerarUniversoModalOpen}
        existingUniversos={universos}
        onClose={() => setGerarUniversoModalOpen(false)}
        onRefresh={loadAll}
      />

      <UniversoModal
        open={universoModalOpen}
        editingUniverso={editingUniverso}
        submitting={submitting}
        submitError={modalError}
        onClose={() => {
          setUniversoModalOpen(false);
          setEditingUniverso(null);
          setModalError(null);
        }}
        onSubmit={handleSaveUniverso}
      />

      <HistoriaModal
        open={historiaModalOpen}
        editingHistoria={editingHistoria}
        universos={universos}
        submitting={submitting}
        submitError={modalError}
        onClose={() => {
          setHistoriaModalOpen(false);
          setEditingHistoria(null);
          setModalError(null);
        }}
        onSubmit={handleSaveHistoria}
      />

      <ConfirmDeleteModal
        open={Boolean(deletingHistoria)}
        title="Confirmar exclusão de registro"
        itemName={deletingHistoria?.titulo ?? ""}
        description="Tem certeza de que deseja remover permanentemente o registro"
        submitting={submitting}
        onCancel={() => setDeletingHistoria(null)}
        onConfirm={handleConfirmDeleteHistoria}
      />

      <ConfirmDeleteModal
        open={Boolean(deletingUniverso)}
        title="Confirmar exclusão de universo"
        itemName={deletingUniverso?.nome ?? ""}
        description="Tem certeza de que deseja remover permanentemente o universo"
        warningDetail={
          linkedStoriesCountForDelete > 0
            ? `Atenção: ao excluir este universo, ${
                linkedStoriesCountForDelete === 1
                  ? "1 história vinculada"
                  : `todas as ${linkedStoriesCountForDelete} histórias vinculadas`
              } a ele também serão excluídas permanentemente do arquivo.`
            : "Atenção: todas as histórias vinculadas a este universo também serão excluídas permanentemente. Esta ação não pode ser desfeita."
        }
        submitting={submitting}
        onCancel={() => setDeletingUniverso(null)}
        onConfirm={handleConfirmDeleteUniverso}
      />
    </div>
  );
}
