import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  CATEGORIAS,
  type Categoria,
  type CreateHistoriaInput,
  type Historia,
  type Universo,
} from "../../../lib/types";
import { ArchivalImage } from "../ArchivalImage";

interface HistoriaModalProps {
  open: boolean;
  editingHistoria: Historia | null;
  universos: Universo[];
  submitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (values: CreateHistoriaInput) => Promise<void>;
}

interface FormErrors {
  universo_id?: string;
  titulo?: string;
  categoria?: string;
  resumo?: string;
  conteudo?: string;
  imagem_capa_url?: string;
}

export function HistoriaModal({
  open,
  editingHistoria,
  universos,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: HistoriaModalProps) {
  const [universoId, setUniversoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Personagem");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [imagemCapaUrl, setImagemCapaUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setUniversoId(editingHistoria?.universo_id ?? universos[0]?.id ?? "");
      setTitulo(editingHistoria?.titulo ?? "");
      setCategoria(editingHistoria?.categoria ?? "Personagem");
      setResumo(editingHistoria?.resumo ?? "");
      setConteudo(editingHistoria?.conteudo ?? "");
      setImagemCapaUrl(editingHistoria?.imagem_capa_url ?? "");
      setErrors({});
    }
  }, [open, editingHistoria, universos]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!universoId) {
      next.universo_id = "Selecione o universo ao qual este registro pertence.";
    }
    if (!titulo.trim()) {
      next.titulo = "O título do registro é obrigatório.";
    }
    if (!categoria) {
      next.categoria = "Selecione uma categoria catalográfica.";
    }
    if (!resumo.trim()) {
      next.resumo = "O resumo introdutório é obrigatório.";
    }
    if (!conteudo.trim()) {
      next.conteudo = "O conteúdo completo da crônica é obrigatório.";
    }
    if (!imagemCapaUrl.trim()) {
      next.imagem_capa_url = "A URL da imagem de capa é obrigatória.";
    } else if (!/^https?:\/\/.+/i.test(imagemCapaUrl.trim())) {
      next.imagem_capa_url = "Informe uma URL válida iniciada por http:// ou https://.";
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    await onSubmit({
      universo_id: universoId,
      titulo: titulo.trim(),
      categoria,
      resumo: resumo.trim(),
      conteudo: conteudo.trim(),
      imagem_capa_url: imagemCapaUrl.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="historia-modal-title"
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-[#1C1A17] sm:bg-[#0E0E0E]/85 sm:p-6"
    >
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-3xl bg-[#1C1A17] sm:border border-[#987654]/65 flex flex-col">
        {/* Sticky Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#161616] border-b border-[#987654]/35 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059] truncate">
              {editingHistoria ? "EDIÇÃO DE REGISTRO" : "NOVO REGISTRO DE CRÔNICA"}
            </span>
            <h2
              id="historia-modal-title"
              className="mt-1 font-display text-2xl text-[#E8DFD0] truncate"
            >
              {editingHistoria ? "Editar Registro" : "Novo Registro"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar janela"
            className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center border border-[#987654]/45 text-[#B3A898] hover:text-[#E8DFD0] hover:border-[#C5A059] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form with scrollable body and sticky bottom action bar */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {submitError && (
              <div
                role="alert"
                className="bg-[#161616] border border-[#DF6C4F]/80 px-4 py-3 font-serif text-[14px] text-[#FFB4A2]"
              >
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="hist-universo"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                >
                  Universo <span className="text-[#DF6C4F]">*</span>
                </label>
                <select
                  id="hist-universo"
                  value={universoId}
                  onChange={(e) => {
                    setUniversoId(e.target.value);
                    if (errors.universo_id)
                      setErrors((prev) => ({ ...prev, universo_id: undefined }));
                  }}
                  className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-2.5 font-serif text-[16px] text-[#E8DFD0] focus:outline-none ${
                    errors.universo_id
                      ? "border-[#DF6C4F]"
                      : "border-[#987654]/45 focus:border-[#C5A059]"
                  }`}
                >
                  {universos.length === 0 && (
                    <option value="">Nenhum universo disponível</option>
                  )}
                  {universos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo} — {u.nome}
                    </option>
                  ))}
                </select>
                {errors.universo_id && (
                  <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                    {errors.universo_id}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="hist-categoria"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
                >
                  Categoria <span className="text-[#DF6C4F]">*</span>
                </label>
                <select
                  id="hist-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as Categoria)}
                  className="w-full min-h-[46px] bg-[#0E0E0E] border border-[#987654]/45 focus:border-[#C5A059] px-4 py-2.5 font-serif text-[16px] text-[#E8DFD0] focus:outline-none"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="hist-titulo"
                className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
              >
                Título <span className="text-[#DF6C4F]">*</span>
              </label>
              <input
                id="hist-titulo"
                type="text"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  if (errors.titulo)
                    setErrors((prev) => ({ ...prev, titulo: undefined }));
                }}
                placeholder="Ex.: A Batalha dos Campos do Pelennor"
                className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-2.5 font-serif text-[16px] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none ${
                  errors.titulo
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.titulo && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.titulo}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="hist-imagem"
                className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
              >
                URL da Imagem de Capa <span className="text-[#DF6C4F]">*</span>
              </label>
              <input
                id="hist-imagem"
                type="url"
                value={imagemCapaUrl}
                onChange={(e) => {
                  setImagemCapaUrl(e.target.value);
                  if (errors.imagem_capa_url)
                    setErrors((prev) => ({ ...prev, imagem_capa_url: undefined }));
                }}
                placeholder="https://images.unsplash.com/..."
                className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-2.5 font-mono text-xs text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none ${
                  errors.imagem_capa_url
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.imagem_capa_url && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.imagem_capa_url}
                </p>
              )}
              {imagemCapaUrl.trim() && (
                <div className="mt-3">
                  <ArchivalImage
                    src={imagemCapaUrl}
                    alt={titulo || "Pré-visualização da capa"}
                    code={categoria.toUpperCase()}
                    aspectClassName="aspect-[16/7]"
                  />
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="hist-resumo"
                className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
              >
                Resumo <span className="text-[#DF6C4F]">*</span>
              </label>
              <textarea
                id="hist-resumo"
                rows={3}
                value={resumo}
                onChange={(e) => {
                  setResumo(e.target.value);
                  if (errors.resumo)
                    setErrors((prev) => ({ ...prev, resumo: undefined }));
                }}
                placeholder="Síntese editorial apresentada nos cartões de dossiê e na abertura da leitura..."
                className={`w-full bg-[#0E0E0E] border px-4 py-3 font-serif text-[16px] leading-relaxed text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none resize-y ${
                  errors.resumo
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.resumo && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.resumo}
                </p>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <label
                  htmlFor="hist-conteudo"
                  className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898]"
                >
                  Conteúdo do Registro <span className="text-[#DF6C4F]">*</span>
                </label>
                <span className="font-mono text-[10px] text-[#726A5E]">
                  Separe parágrafos com uma linha em branco
                </span>
              </div>
              <textarea
                id="hist-conteudo"
                rows={7}
                value={conteudo}
                onChange={(e) => {
                  setConteudo(e.target.value);
                  if (errors.conteudo)
                    setErrors((prev) => ({ ...prev, conteudo: undefined }));
                }}
                placeholder="Escreva a crônica completa separando cada parágrafo por uma linha em branco..."
                className={`w-full bg-[#0E0E0E] border px-4 py-3 font-serif text-[16px] leading-[1.7] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none resize-y ${
                  errors.conteudo
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.conteudo && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.conteudo}
                </p>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="shrink-0 bg-[#161616] border-t border-[#987654]/35 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 sm:flex-none min-h-[46px] px-5 py-2.5 bg-transparent border border-[#987654]/60 text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || universos.length === 0}
              className="flex-1 sm:flex-none min-h-[46px] px-6 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
