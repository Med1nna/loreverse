import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { CreateUniversoInput, Universo } from "../../../lib/types";
import { ArchivalImage } from "../ArchivalImage";

interface UniversoModalProps {
  open: boolean;
  editingUniverso: Universo | null;
  submitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (values: CreateUniversoInput) => Promise<void>;
}

interface FormErrors {
  nome?: string;
  descricao?: string;
  imagem_url?: string;
}

export function UniversoModal({
  open,
  editingUniverso,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: UniversoModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setNome(editingUniverso?.nome ?? "");
      setDescricao(editingUniverso?.descricao ?? "");
      setImagemUrl(editingUniverso?.imagem_url ?? "");
      setErrors({});
    }
  }, [open, editingUniverso]);

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
    if (!nome.trim()) {
      next.nome = "O nome do universo é obrigatório.";
    }
    if (!descricao.trim()) {
      next.descricao = "A descrição editorial do universo é obrigatória.";
    }
    if (!imagemUrl.trim()) {
      next.imagem_url = "A URL da imagem de referência é obrigatória.";
    } else if (!/^https?:\/\/.+/i.test(imagemUrl.trim())) {
      next.imagem_url = "Informe uma URL válida iniciada por http:// ou https://.";
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
      nome: nome.trim(),
      descricao: descricao.trim(),
      imagem_url: imagemUrl.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="universo-modal-title"
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-[#1C1A17] sm:bg-[#0E0E0E]/85 sm:p-6"
    >
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-[#1C1A17] sm:border border-[#987654]/65 flex flex-col">
        {/* Sticky Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#161616] border-b border-[#987654]/35 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#C5A059] truncate">
              {editingUniverso
                ? `EDIÇÃO DE CATÁLOGO · ${editingUniverso.codigo}`
                : "NOVO FICHÁRIO DE UNIVERSO"}
            </span>
            <h2
              id="universo-modal-title"
              className="mt-1 font-display text-2xl text-[#E8DFD0] truncate"
            >
              {editingUniverso ? "Editar Universo" : "Novo Universo"}
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

            <div>
              <label
                htmlFor="univ-nome"
                className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
              >
                Nome do Universo <span className="text-[#DF6C4F]">*</span>
              </label>
              <input
                id="univ-nome"
                type="text"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }));
                }}
                placeholder="Ex.: Duna"
                className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-2.5 font-serif text-[16px] text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none ${
                  errors.nome
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.nome && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.nome}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="univ-descricao"
                className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
              >
                Descrição <span className="text-[#DF6C4F]">*</span>
              </label>
              <textarea
                id="univ-descricao"
                rows={4}
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (errors.descricao)
                    setErrors((prev) => ({ ...prev, descricao: undefined }));
                }}
                placeholder="Apresentação histórica e editorial deste universo..."
                className={`w-full bg-[#0E0E0E] border px-4 py-3 font-serif text-[16px] leading-relaxed text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none resize-y ${
                  errors.descricao
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.descricao && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.descricao}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="univ-imagem"
                className="block font-mono text-[11px] uppercase tracking-[0.11em] text-[#B3A898] mb-2"
              >
                URL da Imagem <span className="text-[#DF6C4F]">*</span>
              </label>
              <input
                id="univ-imagem"
                type="url"
                value={imagemUrl}
                onChange={(e) => {
                  setImagemUrl(e.target.value);
                  if (errors.imagem_url)
                    setErrors((prev) => ({ ...prev, imagem_url: undefined }));
                }}
                placeholder="https://images.unsplash.com/..."
                className={`w-full min-h-[46px] bg-[#0E0E0E] border px-4 py-2.5 font-mono text-xs text-[#E8DFD0] placeholder:text-[#726A5E] focus:outline-none ${
                  errors.imagem_url
                    ? "border-[#DF6C4F]"
                    : "border-[#987654]/45 focus:border-[#C5A059]"
                }`}
              />
              {errors.imagem_url && (
                <p role="alert" className="mt-1.5 font-mono text-[11px] text-[#DF6C4F]">
                  {errors.imagem_url}
                </p>
              )}

              {imagemUrl.trim() && (
                <div className="mt-3">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#726A5E] mb-1.5">
                    Pré-visualização da lâmina
                  </span>
                  <ArchivalImage
                    src={imagemUrl}
                    alt={nome || "Pré-visualização do universo"}
                    code={editingUniverso?.codigo ?? "NOVO ARQ."}
                    aspectClassName="aspect-[16/7]"
                  />
                </div>
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
              disabled={submitting}
              className="flex-1 sm:flex-none min-h-[46px] px-6 py-2.5 bg-[#C5A059] text-[#0E0E0E] border border-[#C5A059] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-transparent hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
