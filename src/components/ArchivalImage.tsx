import { useEffect, useState } from "react";

interface ArchivalImageProps {
  src: string;
  alt: string;
  code?: string;
  caption?: string;
  className?: string;
  aspectClassName?: string;
  priority?: boolean;
}

export function ArchivalImage({
  src,
  alt,
  code = "PLACA ARQ.",
  className = "",
  aspectClassName = "aspect-[16/10]",
  priority = false,
}: ArchivalImageProps) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setLoaded(false);
  }, [src]);

  const trimmedSrc = src?.trim() ?? "";
  const showFallback = !trimmedSrc || hasError;

  return (
    <div
      className={`relative overflow-hidden bg-[#131313] border border-[#987654]/30 ${aspectClassName} ${className}`}
    >
      {showFallback ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#161616]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 35%, rgba(197, 160, 89, 0.12), transparent 65%), repeating-linear-gradient(0deg, rgba(152,118,84,0.05) 0px, rgba(152,118,84,0.05) 1px, transparent 1px, transparent 24px)",
          }}
        >
          {/* Corner registration hairlines */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-t border-l border-[#C5A059]/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-t border-r border-[#C5A059]/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#C5A059]/60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#C5A059]/60"
          />
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#C5A059] mb-2">
            {code}
          </span>
          <span className="font-display text-lg text-[#E8DFD0]/90 max-w-[22ch] leading-snug">
            {alt}
          </span>
          <span className="mt-2 font-mono text-[10px] tracking-[0.1em] uppercase text-[#726A5E]">
            Lâmina ilustrativa indisponível
          </span>
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-[#161616] animate-pulse" />
          )}
          <img
            src={trimmedSrc}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ease-out ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Subtle museum vignette for archival tonal unity */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E0E0E]/75 via-[#0E0E0E]/15 to-transparent"
          />
        </>
      )}
    </div>
  );
}
