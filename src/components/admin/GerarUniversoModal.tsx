import { AlertCircle, Check, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getAccessToken } from "../../../lib/auth";
import {
  createHistoria,
  createUniverso,
  generateSlug,
  getUniversoBySlug,
} from "../../../lib/data";
import type { Categoria, Universo } from "../../../lib/types";
import { ArchivalImage } from "../ArchivalImage";

interface GerarUniversoModalProps {
  open: boolean;
  existingUniversos: Universo[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

type ModalStep = "form" | "review" | "progress";

interface SuggestedTema {
  id: string;
  titulo: string;
  categoria: Categoria;
  resumo: string;
  selected: boolean;
}

type ProgressItemStatus = "pending" | "generating" | "done" | "error" | "skipped";

interface ProgressItem {
  id: string;
  titulo: string;
  categoria: Categoria;
  resumo: string;
  status: ProgressItemStatus;
  errorDetail?: string;
}

const DELAY_BETWEEN_CALLS_MS = 2000;

export function GerarUniversoModal({
  open,
  existingUniversos,
  onClose,
  onRefresh,
}: GerarUniversoModalProps) {
  const [step, setStep] = useState<ModalStep>("form");

  // Step 1: Form
  const [nome, setNome] = useState("");
  const [orientacoes, setOrientacoes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);

  // Step 2: Review
  const [universoSlug, setUniversoSlug] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [temas, setTemas] = useState<SuggestedTema[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Step 3: Progress
  const [runningProgress, setRunningProgress] = useState(false);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [createdUniverso, setCreatedUniverso] = useState<Universo | null>(null);
  const [createdStoriesCount, setCreatedStoriesCount] = useState<number>(0);
  const [progressStatusText, setProgressStatusText] = useState<string>("");
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  // Inline close confirmation while busy
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const cancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const sleepResolveRef = useRef<(() => void) | null>(null);

  const isBusy = researching || runningProgress;

  const clearPendingSleep = () => {
    if (sleepTimerRef.current !== null) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepResolveRef.current) {
      sleepResolveRef.current();
      sleepResolveRef.current = null;
    }
  };

  const cancellableSleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      sleepResolveRef.current = resolve;
      sleepTimerRef.current = window.setTimeout(() => {
        sleepTimerRef.current = null;
        sleepResolveRef.current = null;
        resolve();
      }, ms);
    });
  };

  const resetAll = () => {
    cancelledRef.current = false;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearPendingSleep();

    setStep("form");
    setNome("");
    setOrientacoes("");
    setFormError(null);
    setResearching(false);

    setUniversoSlug("");
    setDescricao("");
    setImagemUrl("");
    setTemas([]);
    setReviewError(null);

    setRunningProgress(false);
    setProgressItems([]);
    setCurrentIndex(0);
    setCreatedUniverso(null);
    setCreatedStoriesCount(0);
    setProgressStatusText("");
    setRateLimitMessage(null);
    setProgressError(null);
    setFinished(false);
    setConfirmCloseOpen(false);
  };

  useEffect(() => {
    if (open) {
      resetAll();
    } else {
      cancelledRef.current = true;
      abortControllerRef.current?.abort();
      clearPendingSleep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestClose = () => {
    if (isBusy) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  };

  const confirmInterruptAndClose = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    clearPendingSleep();
    setConfirmCloseOpen(false);
    setResearching(false);
    setRunningProgress(false);
    if (createdUniverso) {
      void onRefresh();
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmCloseOpen) {
          setConfirmCloseOpen(false);
        } else {
          requestClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isBusy, confirmCloseOpen]);

  if (!open) return null;

  // Step 1: Research universe via /api/gerar-universo
  const handleResearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      setFormError("O nome do universo é obrigatório.");
      return;
    }

    const slug = generateSlug(trimmedNome);
    if (!slug) {
      setFormError("Informe um nome válido para o universo.");
      return;
    }

    setFormError(null);
    setResearching(true);
    cancelledRef.current = false;

    try {
      // Check duplicate slug locally and in Supabase before calling Gemini
      const localMatch = existingUniversos.some((u) => u.slug === slug);
      if (localMatch) {
        setFormError("Este universo já está no arquivo.");
        return;
      }

      const remoteMatch = await getUniversoBySlug(slug);
      if (cancelledRef.current) return;
      if (remoteMatch) {
        setFormError("Este universo já está no arquivo.");
        return;
      }

      const token = await getAccessToken();
      if (cancelledRef.current) return;
      if (!token) {
        setFormError("Sua sessão expirou. Entre novamente.");
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/gerar-universo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: trimmedNome,
          orientacoes: orientacoes.trim() || undefined,
        }),
        signal: controller.signal,
      });

      if (cancelledRef.current) return;

      if (response.status === 401) {
        setFormError("Sua sessão expirou. Entre novamente.");
        return;
      }

      if (response.status === 429) {
        setFormError(
          "Limite gratuito da IA atingido. Tente novamente mais tarde."
        );
        return;
      }

      if (!response.ok) {
        setFormError("Não foi possível consultar os arquivos agora.");
        return;
      }

      const data = (await response.json()) as {
        descricao?: string;
        temas?: Array<{
          titulo: string;
          categoria: Categoria;
          resumo: string;
        }>;
      };

      if (cancelledRef.current) return;

      const list = Array.isArray(data.temas) ? data.temas : [];
      const suggested: SuggestedTema[] = list.map((item, idx) => ({
        id: `${idx}-${generateSlug(item.titulo)}`,
        titulo: item.titulo,
        categoria: item.categoria,
        resumo: item.resumo,
        selected: true,
      }));

      setUniversoSlug(slug);
      setDescricao(typeof data.descricao === "string" ? data.descricao.trim() : "");
      setImagemUrl(`https://picsum.photos/seed/${slug}/1600/900`);
      setTemas(suggested);
      setReviewError(null);
      setStep("review");
    } catch (error) {
      if (cancelledRef.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível consultar os arquivos agora."
      );
    } finally {
      abortControllerRef.current = null;
      if (!cancelledRef.current) {
        setResearching(false);
      }
    }
  };

  // Step 2 -> Step 3: Create universo and sequentially generate + save stories
  const handleStartGeneration = async () => {
    const trimmedDescricao = descricao.trim();
    const selectedTemas = temas.filter((t) => t.selected);

    if (!trimmedDescricao) {
      setReviewError("A descrição do universo é obrigatória.");
      return;
    }

    if (selectedTemas.length === 0) {
      setReviewError("Selecione ao menos um tema para gerar.");
      return;
    }

    const finalImagemUrl =
      imagemUrl.trim() || `https://picsum.photos/seed/${universoSlug}/1600/900`;

    if (!/^https?:\/\/.+/i.test(finalImagemUrl)) {
      setReviewError(
        "Informe uma URL de imagem válida iniciada por http:// ou https://."
      );
      return;
    }

    setReviewError(null);

    const initialItems: ProgressItem[] = selectedTemas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      categoria: t.categoria,
      resumo: t.resumo,
      status: "pending",
    }));

    setProgressItems(initialItems);
    setCurrentIndex(0);
    setCreatedUniverso(null);
    setCreatedStoriesCount(0);
    setRateLimitMessage(null);
    setProgressError(null);
    setFinished(false);
    setProgressStatusText("Catalogando universo no arquivo...");
    setStep("progress");
    setRunningProgress(true);
    cancelledRef.current = false;

    try {
      const token = await getAccessToken();
      if (cancelledRef.current) return;
      if (!token) {
        setProgressError("Sua sessão expirou. Entre novamente.");
        setRunningProgress(false);
        setFinished(true);
        return;
      }

      // 1. Create the universo via existing createUniverso
      let universoCriado: Universo;
      try {
        universoCriado = await createUniverso({
          nome: nome.trim(),
          descricao: trimmedDescricao,
          imagem_url: finalImagemUrl,
        });
      } catch (err) {
        if (cancelledRef.current) return;
        setProgressError(
          err instanceof Error
            ? err.message
            : "Não foi possível criar o universo no arquivo."
        );
        setRunningProgress(false);
        setFinished(true);
        return;
      }

      if (cancelledRef.current) return;
      setCreatedUniverso(universoCriado);
      void onRefresh();

      // 2. Sequentially generate and save each selected tema
      let savedCount = 0;
      const total = initialItems.length;

      for (let i = 0; i < total; i++) {
        if (cancelledRef.current) break;

        const item = initialItems[i];
        setCurrentIndex(i + 1);
        setProgressStatusText(`Gerando ${i + 1} de ${total} — ${item.titulo}...`);
        setProgressItems((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "generating" } : p))
        );

        let hitRateLimit = false;
        let hitUnauthorized = false;

        try {
          const currentToken = (await getAccessToken()) ?? token;
          if (cancelledRef.current) break;

          const controller = new AbortController();
          abortControllerRef.current = controller;

          const response = await fetch("/api/gerar-historia", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({
              universo: universoCriado.nome,
              titulo: item.titulo,
              categoria: item.categoria,
            }),
            signal: controller.signal,
          });

          abortControllerRef.current = null;
          if (cancelledRef.current) break;

          if (response.status === 429) {
            hitRateLimit = true;
            setRateLimitMessage(
              "Limite gratuito da IA atingido. As histórias já criadas foram salvas; tente o restante mais tarde."
            );
            setProgressItems((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? { ...p, status: "error", errorDetail: "Limite da IA atingido" }
                  : idx > i
                    ? { ...p, status: "skipped" }
                    : p
              )
            );
          } else if (response.status === 401) {
            hitUnauthorized = true;
            setProgressError("Sua sessão expirou. Entre novamente.");
            setProgressItems((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? { ...p, status: "error", errorDetail: "Sessão expirada" }
                  : idx > i
                    ? { ...p, status: "skipped" }
                    : p
              )
            );
          } else if (!response.ok) {
            setProgressItems((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? { ...p, status: "error", errorDetail: "Falha ao gerar texto" }
                  : p
              )
            );
          } else {
            const generated = (await response.json()) as {
              resumo?: string;
              conteudo?: string;
            };

            const conteudo =
              typeof generated.conteudo === "string"
                ? generated.conteudo.trim()
                : "";
            const resumoFinal =
              item.resumo.trim() ||
              (typeof generated.resumo === "string" ? generated.resumo.trim() : "");

            if (!conteudo || !resumoFinal) {
              setProgressItems((prev) =>
                prev.map((p, idx) =>
                  idx === i
                    ? { ...p, status: "error", errorDetail: "Conteúdo vazio da IA" }
                    : p
                )
              );
            } else {
              const historiaSlug = generateSlug(item.titulo);
              await createHistoria({
                universo_id: universoCriado.id,
                titulo: item.titulo,
                categoria: item.categoria,
                resumo: resumoFinal,
                conteudo,
                imagem_capa_url: `https://picsum.photos/seed/${historiaSlug}/1200/800`,
              });

              savedCount += 1;
              setCreatedStoriesCount(savedCount);
              setProgressItems((prev) =>
                prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p))
              );
            }
          }
        } catch (err) {
          abortControllerRef.current = null;
          if (cancelledRef.current) break;
          if (err instanceof DOMException && err.name === "AbortError") break;

          setProgressItems((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    status: "error",
                    errorDetail:
                      err instanceof Error ? err.message : "Erro ao salvar registro",
                  }
                : p
            )
          );
        }

        if (hitRateLimit || hitUnauthorized || cancelledRef.current) {
          break;
        }

        // Wait 2 seconds between calls (when there is a next item)
        if (i < total - 1) {
          await cancellableSleep(DELAY_BETWEEN_CALLS_MS);
        }
      }

      if (!cancelledRef.current) {
        setRunningProgress(false);
        setFinished(true);
        setProgressStatusText("");
        await onRefresh();
      }
    } finally {
      abortControllerRef.current = null;
      clearPendingSleep();
      if (!cancelledRef.current) {
        setRunningProgress(false);
      }
    }
  };

  const toggleTema = (id: string) => {
    setTemas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
    if (reviewError) setReviewError(null);
  };

  const selectedCount = temas.filter((t) => t.selected).length;

  const stepMeta =
    step === "form"
      ? {
          eyebrow: "ASSISTENTE DE CATALOGAÇÃO · ETAPA 1 DE 3",
          title: "Gerar Universo com IA",
        }
      : step === "review"
        ? {
            eyebrow: "REVISÃO DO ACERVO · ETAPA 2 DE 3",
            title: nome.trim() || "Revisar Universo",
          }
        : {
            eyebrow: finished
              ? "CATALOGAÇÃO CONCLUÍDA · ETAPA 3 DE 3"
              : "REGISTRANDO ARQUIVO · ETAPA 3 DE 3",
            title: createdUniverso?.nome || nome.trim(),
          };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gerar-universo-modal-title"
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-[#1C1A17] sm:bg-[#0E0E0E]/85 sm:p-6"
    >
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-3xl bg-[#1C1A17] sm:border border-[#987654]/65 flex flex-col">
        {/* Sticky Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#161616] border-b border-[#987654]/35 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059] truncate">
              {stepMeta.eyebrow}
            </span>
            <h2
              id="gerar-universo-modal-title"
              className="mt-1 font-display text-2xl text-[#E8DFD0] truncate"
            >
              {stepMeta.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar janela"
            className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center border border-[#987654]/45 text-[#B3A898] hover:text-[#E8DFD0] hover:border-[#C5A059] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STATE A: FORM */}
        {step === "form" && (
          <form
            onSubmit={handleResearch}
            noValidate
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <p className="font-serif text-[15px] leading-relaxed text-[#B3A898]">
                Informe o nome de um universo ficcional. O arquivista digital
                pesquisará a descrição e os principais temas canônicos para
                revisão antes de criar o acervo.
              </p>

              {formError && (
                <div
                  role="alert"
                  className="bg-[#161616] border border-[#DF6C4F]/80 px-4 py-3 font-serif text-[14px] text-[#FFB4A2]"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="ai-univ-nome"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                >
                  Nome do universo <span className="text-[#DF6C4F]">*</span>
                </label>
                <input
                  id="ai-univ-nome"
                  type="text"
                  disabled={researching}
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Ex.: Naruto, Duna, Elden Ring, Mass Effect..."
                  className="w-full min-h-[46px] bg-[#0E0E0E] border border-[#987654]/45 focus:border-[#C5A059] px-4 py-2.5 font-serif text-[16px] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="ai-univ-orientacoes"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                >
                  Orientações para a IA (opcional)
                </label>
                <textarea
                  id="ai-univ-orientacoes"
                  rows={3}
                  disabled={researching}
                  value={orientacoes}
                  onChange={(e) => setOrientacoes(e.target.value)}
                  placeholder="Ex.: priorizar arcos clássicos, incluir facções políticas ou eras fundadoras..."
                  className="w-full bg-[#0E0E0E] border border-[#987654]/45 focus:border-[#C5A059] px-4 py-3 font-serif text-[15px] leading-relaxed text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none resize-y disabled:opacity-60"
                />
              </div>
            </div>

            <div className="shrink-0 bg-[#161616] border-t border-[#987654]/35 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={requestClose}
                className="flex-1 sm:flex-none min-h-[46px] px-5 py-2.5 bg-transparent border border-[#987654]/60 text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={researching || !nome.trim()}
                className="flex-1 sm:flex-none min-h-[46px] px-6 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {researching ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-current animate-pulse" />
                    <span>Consultando os arquivos...</span>
                  </>
                ) : (
                  <span>Pesquisar arquivo</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STATE B: REVIEW */}
        {step === "review" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {reviewError && (
                <div
                  role="alert"
                  className="bg-[#161616] border border-[#DF6C4F]/80 px-4 py-3 font-serif text-[14px] text-[#FFB4A2]"
                >
                  {reviewError}
                </div>
              )}

              {temas.length === 0 ? (
                <div className="bg-[#161616] border border-[#DF6C4F]/70 p-5 space-y-2">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#DF6C4F]">
                    REGISTRO INSUFICIENTE
                  </span>
                  <p className="font-serif text-[16px] text-[#E8DFD0]">
                    A IA não encontrou informações canônicas sobre esse universo.
                  </p>
                  <p className="font-serif text-[14px] text-[#B3A898]">
                    Verifique a grafia do universo ou forneça orientações mais
                    específicas para tentar novamente.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="ai-review-descricao"
                      className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                    >
                      Descrição do universo <span className="text-[#DF6C4F]">*</span>
                    </label>
                    <textarea
                      id="ai-review-descricao"
                      rows={3}
                      value={descricao}
                      onChange={(e) => {
                        setDescricao(e.target.value);
                        if (reviewError) setReviewError(null);
                      }}
                      className="w-full bg-[#0E0E0E] border border-[#987654]/45 focus:border-[#C5A059] px-4 py-3 font-serif text-[16px] leading-relaxed text-[#E8DFD0] focus:outline-none resize-y"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ai-review-imagem"
                      className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                    >
                      URL da imagem (opcional)
                    </label>
                    <input
                      id="ai-review-imagem"
                      type="url"
                      value={imagemUrl}
                      onChange={(e) => {
                        setImagemUrl(e.target.value);
                        if (reviewError) setReviewError(null);
                      }}
                      placeholder={`https://picsum.photos/seed/${universoSlug}/1600/900`}
                      className="w-full min-h-[46px] bg-[#0E0E0E] border border-[#987654]/45 focus:border-[#C5A059] px-4 py-2.5 font-mono text-xs text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none"
                    />
                    {imagemUrl.trim() && (
                      <div className="mt-3">
                        <ArchivalImage
                          src={imagemUrl.trim()}
                          alt={nome || "Pré-visualização do universo"}
                          code={`/${universoSlug}`}
                          aspectClassName="aspect-[16/7]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-dashed border-[#726A5E]/50 space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.11em] text-[#C5A059]">
                        Temas sugeridos para catalogação
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] tabular-nums">
                        {selectedCount} de {temas.length} selecionados
                      </span>
                    </div>

                    <div className="divide-y divide-[#1C1A17] border border-[#987654]/35 bg-[#161616]">
                      {temas.map((tema) => (
                        <label
                          key={tema.id}
                          className="flex items-start gap-3.5 p-4 cursor-pointer hover:bg-[#1C1A17]/60 transition-colors min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={tema.selected}
                            onChange={() => toggleTema(tema.id)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 w-5 h-5 shrink-0 border inline-flex items-center justify-center transition-colors ${
                              tema.selected
                                ? "bg-[#C5A059] border-[#C5A059] text-[#0E0E0E]"
                                : "bg-[#0E0E0E] border-[#987654]/60 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>

                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="inline-block px-2 py-0.5 border border-[#987654]/50 bg-[#0E0E0E] font-mono text-[10px] uppercase tracking-[0.11em] text-[#C5A059]">
                                {tema.categoria}
                              </span>
                              <span className="font-display text-xl leading-snug text-[#E8DFD0]">
                                {tema.titulo}
                              </span>
                            </span>
                            {tema.resumo && (
                              <span className="block font-serif text-[14px] leading-relaxed text-[#B3A898]">
                                {tema.resumo}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0 bg-[#161616] border-t border-[#987654]/35 px-5 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setReviewError(null);
                  setStep("form");
                }}
                className="min-h-[46px] px-4 py-2.5 bg-transparent border border-[#987654]/60 text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <div className="flex items-center gap-3 flex-1 sm:flex-none justify-end">
                <button
                  type="button"
                  onClick={requestClose}
                  className="min-h-[46px] px-4 py-2.5 bg-transparent border border-[#987654]/60 text-[#B3A898] hover:text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                {temas.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartGeneration}
                    disabled={selectedCount === 0 || !descricao.trim()}
                    className="min-h-[46px] px-5 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.11em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    Criar universo e gerar histórias
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATE C: PROGRESS */}
        {step === "progress" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Live status strip */}
              {runningProgress && progressStatusText && (
                <div
                  role="status"
                  aria-live="polite"
                  className="bg-[#161616] border border-[#C5A059]/75 px-4 py-3.5 flex items-center gap-3"
                >
                  <span className="inline-block w-2.5 h-2.5 bg-[#C5A059] animate-pulse shrink-0" />
                  <span className="font-mono text-xs text-[#E8DFD0] tracking-[0.04em]">
                    {progressStatusText}
                  </span>
                </div>
              )}

              {/* Rate-limit notice */}
              {rateLimitMessage && (
                <div
                  role="alert"
                  className="bg-[#161616] border border-[#DF6C4F] px-4 py-3.5 font-serif text-[15px] text-[#FFB4A2]"
                >
                  {rateLimitMessage}
                </div>
              )}

              {/* Fatal / Auth error notice */}
              {progressError && (
                <div
                  role="alert"
                  className="bg-[#161616] border border-[#DF6C4F] px-4 py-3.5 font-serif text-[15px] text-[#FFB4A2]"
                >
                  {progressError}
                </div>
              )}

              {/* Completion summary */}
              {finished && createdUniverso && (
                <div
                  role="status"
                  className="bg-[#161616] border border-[#C5A059] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059]">
                      {createdUniverso.codigo} · CATALOGAÇÃO REGISTRADA
                    </span>
                    <p className="font-display text-2xl text-[#E8DFD0]">
                      {createdStoriesCount === 1
                        ? "Arquivo criado: 1 história registrada."
                        : `Arquivo criado: ${createdStoriesCount} histórias registradas.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Progress list */}
              <div className="border border-[#987654]/35 bg-[#161616] divide-y divide-[#1C1A17]">
                {progressItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="w-6 h-6 shrink-0 inline-flex items-center justify-center">
                        {item.status === "done" && (
                          <Check
                            className="w-4 h-4 text-[#C5A059]"
                            aria-label="Concluído"
                          />
                        )}
                        {item.status === "error" && (
                          <AlertCircle
                            className="w-4 h-4 text-[#DF6C4F]"
                            aria-label="Erro"
                          />
                        )}
                        {item.status === "generating" && (
                          <span
                            className="w-2.5 h-2.5 bg-[#C5A059] animate-pulse"
                            aria-label="Gerando"
                          />
                        )}
                        {(item.status === "pending" ||
                          item.status === "skipped") && (
                          <span className="font-mono text-[10px] text-[#726A5E] tabular-nums">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#987654]">
                            {item.categoria}
                          </span>
                          <span
                            className={`font-display text-lg leading-snug truncate ${
                              item.status === "skipped"
                                ? "text-[#726A5E]"
                                : "text-[#E8DFD0]"
                            }`}
                          >
                            {item.titulo}
                          </span>
                        </div>
                        {item.status === "error" && item.errorDetail && (
                          <p className="font-mono text-[10px] text-[#DF6C4F] mt-0.5">
                            {item.errorDetail}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] tabular-nums">
                      {item.status === "done" && (
                        <span className="text-[#C5A059]">Salvo</span>
                      )}
                      {item.status === "generating" && (
                        <span className="text-[#E8DFD0]">
                          {currentIndex}/{progressItems.length}
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-[#DF6C4F]">Falha</span>
                      )}
                      {item.status === "pending" && (
                        <span className="text-[#726A5E]">Aguardando</span>
                      )}
                      {item.status === "skipped" && (
                        <span className="text-[#726A5E]">Interrompido</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 bg-[#161616] border-t border-[#987654]/35 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-end gap-3">
              {runningProgress ? (
                <button
                  type="button"
                  onClick={requestClose}
                  className="min-h-[46px] px-5 py-2.5 bg-transparent border border-[#DF6C4F]/70 text-[#DF6C4F] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer"
                >
                  Interromper
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none min-h-[46px] px-5 py-2.5 bg-transparent border border-[#987654]/60 text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  {createdUniverso && (
                    <Link
                      to={`/universo/${createdUniverso.slug}`}
                      onClick={onClose}
                      className="flex-1 sm:flex-none min-h-[46px] px-6 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <span>Abrir universo</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Inline Archival Close Confirmation Overlay while Generating */}
        {confirmCloseOpen && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-interrupt-title"
            className="absolute inset-0 z-20 bg-[#0E0E0E]/85 flex items-center justify-center p-5"
          >
            <div className="w-full max-w-md bg-[#1C1A17] border border-[#DF6C4F]/80">
              <div className="px-5 py-4 bg-[#161616] border-b border-[#987654]/35">
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#DF6C4F]">
                  OPERAÇÃO EM ANDAMENTO
                </span>
                <h3
                  id="confirm-interrupt-title"
                  className="mt-1 font-display text-2xl text-[#E8DFD0]"
                >
                  Interromper geração?
                </h3>
              </div>
              <div className="p-5">
                <p className="font-serif text-[15px] leading-relaxed text-[#B3A898]">
                  A IA ainda está consultando e registrando os arquivos. Se
                  fechar agora, os itens já salvos permanecerão no acervo, mas
                  os pendentes serão cancelados.
                </p>
              </div>
              <div className="px-5 py-3.5 bg-[#161616] border-t border-[#987654]/35 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmCloseOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-transparent border border-[#987654]/60 text-[#E8DFD0] font-mono text-[11px] uppercase tracking-[0.11em] hover:bg-[#1C1A17] transition-colors cursor-pointer"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={confirmInterruptAndClose}
                  className="min-h-[44px] px-4 py-2 bg-[#DF6C4F] text-[#0E0E0E] border border-[#DF6C4F] font-mono text-[11px] font-bold uppercase tracking-[0.11em] hover:bg-transparent hover:text-[#DF6C4F] transition-colors cursor-pointer"
                >
                  Interromper e fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
