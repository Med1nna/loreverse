interface ArchiveStampProps {
  label: string;
  tone?: "brass" | "terracotta";
  tilt?: "left" | "right" | "none";
  className?: string;
}

export function ArchiveStamp({
  label,
  tone = "brass",
  tilt = "left",
  className = "",
}: ArchiveStampProps) {
  const colorClasses =
    tone === "terracotta"
      ? "border-[#DF6C4F] text-[#DF6C4F]"
      : "border-[#C5A059] text-[#C5A059]";

  const tiltClasses =
    tilt === "left"
      ? "-rotate-[1.5deg]"
      : tilt === "right"
        ? "rotate-[1deg]"
        : "";

  return (
    <span
      className={`inline-block border p-[2px] select-none ${colorClasses} ${tiltClasses} ${className}`}
    >
      <span
        className={`block border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] leading-tight whitespace-nowrap ${colorClasses}`}
      >
        {label}
      </span>
    </span>
  );
}
