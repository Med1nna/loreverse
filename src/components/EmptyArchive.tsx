import type { ReactNode } from "react";
import { ArchiveStamp } from "./ArchiveStamp";

interface EmptyArchiveProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyArchive({
  title = "Nenhum registro encontrado neste arquivo.",
  description,
  action,
}: EmptyArchiveProps) {
  return (
    <div className="bg-[#161616] border border-[#987654]/35 px-6 py-14 text-center flex flex-col items-center justify-center">
      <ArchiveStamp label="FICHÁRIO VAZIO" tone="brass" tilt="left" />
      <p className="mt-6 font-display text-2xl text-[#E8DFD0] max-w-xl">
        {title}
      </p>
      {description && (
        <p className="mt-2 font-serif text-sm text-[#B3A898] max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
