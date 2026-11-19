import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import { ArchiveStamp } from "../ArchiveStamp";

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  itemName: string;
  description: string;
  warningDetail?: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDeleteModal({
  open,
  title,
  itemName,
  description,
  warningDetail,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, submitting, onCancel]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-[#1C1A17] sm:bg-[#0E0E0E]/85 sm:p-6"
    >
      <div className="w-full h-[100dvh] sm:h-auto sm:max-w-lg bg-[#1C1A17] sm:border border-[#DF6C4F]/70 flex flex-col">
        <div className="px-5 sm:px-6 py-4 bg-[#161616] border-b border-[#987654]/30 flex items-center justify-between gap-4 shrink-0">
          <ArchiveStamp label="EXCLUSÃO DEFINITIVA" tone="terracotta" tilt="none" />
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cancelar exclusão"
            className="w-11 h-11 min-w-[44px] min-h-[44px] inline-flex items-center justify-center border border-[#987654]/45 text-[#B3A898] hover:text-[#E8DFD0] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <h2
            id="confirm-delete-title"
            className="font-display text-2xl text-[#E8DFD0]"
          >
            {title}
          </h2>

          <p className="font-serif text-[16px] leading-relaxed text-[#B3A898]">
            {description}{" "}
            <strong className="text-[#E8DFD0] font-medium">“{itemName}”</strong>?
          </p>

          {warningDetail && (
            <div className="bg-[#161616] border border-[#DF6C4F]/60 p-4 flex items-start gap-3">
              <AlertTriangle
                className="w-4 h-4 text-[#DF6C4F] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="font-serif text-[14px] leading-relaxed text-[#FFB4A2]">
                {warningDetail}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 bg-[#161616] border-t border-[#987654]/30 px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 sm:flex-none min-h-[46px] px-5 py-2.5 bg-transparent border border-[#987654]/60 text-[#E8DFD0] font-mono text-xs uppercase tracking-[0.12em] hover:bg-[#1C1A17] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 sm:flex-none min-h-[46px] px-5 py-2.5 bg-transparent border border-[#DF6C4F] text-[#DF6C4F] font-mono text-xs font-bold uppercase tracking-[0.12em] hover:bg-[#DF6C4F] hover:text-[#0E0E0E] transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
