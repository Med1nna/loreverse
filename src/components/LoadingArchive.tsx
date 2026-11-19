interface LoadingArchiveProps {
  message?: string;
  variant?: "grid" | "article" | "table";
}

export function LoadingArchive({
  message = "Consultando fichário...",
  variant = "grid",
}: LoadingArchiveProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full py-10 space-y-6"
    >
      <div className="flex items-center gap-3">
        <span className="inline-block w-2.5 h-2.5 bg-[#C5A059] animate-pulse" />
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#C5A059]">
          {message}
        </p>
      </div>

      {variant === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pt-7 relative">
              <div className="absolute top-0 left-0 h-7 w-40 bg-[#1C1A17] border border-b-0 border-[#987654]/30 dossier-tab" />
              <div className="bg-[#161616] border border-[#987654]/30 p-5 space-y-4">
                <div className="aspect-[16/10] bg-[#1C1A17] animate-pulse" />
                <div className="h-6 w-2/3 bg-[#1C1A17] animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full bg-[#1C1A17] animate-pulse" />
                  <div className="h-3.5 w-5/6 bg-[#1C1A17] animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "article" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 bg-[#161616] border border-[#987654]/30 p-6 space-y-4 h-72 animate-pulse" />
          <div className="lg:col-span-8 space-y-5">
            <div className="h-12 w-3/4 bg-[#161616] animate-pulse" />
            <div className="aspect-[16/9] bg-[#161616] animate-pulse" />
            <div className="space-y-3 pt-4">
              <div className="h-4 w-full bg-[#161616] animate-pulse" />
              <div className="h-4 w-full bg-[#161616] animate-pulse" />
              <div className="h-4 w-4/5 bg-[#161616] animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {variant === "table" && (
        <div className="bg-[#161616] border border-[#987654]/30">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17] last:border-b-0"
            >
              <div className="h-4 w-1/3 bg-[#1C1A17] animate-pulse" />
              <div className="h-4 w-1/6 bg-[#1C1A17] animate-pulse" />
              <div className="h-4 w-24 bg-[#1C1A17] animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
