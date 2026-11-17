import type { ReactNode } from "react";

export function StatCard({ label, value, icon, tone, featured, foot }: {
  label: string;
  value: string;
  icon: string;
  tone: "mint" | "lavender" | "blue" | "amber";
  featured?: boolean;
  foot?: ReactNode;
}) {
  const toneText = { mint: "text-[#15803d]", lavender: "text-[#7c3aed]", blue: "text-[#2563eb]", amber: "text-[#c2410c]" }[tone];
  const toneChip = { mint: "bg-[#15803d14] text-[#15803d]", lavender: "bg-[#7c3aed14] text-[#7c3aed]", blue: "bg-[#2563eb14] text-[#2563eb]", amber: "bg-[#f9731614] text-[#c2410c]" }[tone];

  if (featured) {
    return (
      <div className="stat-card stat-feature flex h-[156px] flex-col justify-between p-5">
        <div className="feature-glow" aria-hidden="true" />
        <div className="relative flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[1.25px] text-[#5c6e63]">{label}</span>
          <span className={`stat-icon text-[13px] ${toneChip}`}><i className={`bi ${icon}`} aria-hidden="true" /></span>
        </div>
        <p className="relative num text-[clamp(25px,2.3vw,37px)] font-semibold leading-none tracking-[-1.4px] text-[#14261c] whitespace-nowrap">{value}</p>
        <div className="relative flex items-center justify-between gap-2 text-[10px] text-[#5c6e63]">{foot}</div>
      </div>
    );
  }

  return (
    <div className="stat-card flex h-[156px] flex-col justify-between p-5">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[1.25px] text-[#5c6e63]">{label}</span>
        <span className={`stat-icon text-[13px] ${toneChip}`}><i className={`bi ${icon}`} aria-hidden="true" /></span>
      </div>
      <p className={`num text-[clamp(23px,2.15vw,34px)] font-semibold leading-none tracking-[-1.4px] whitespace-nowrap ${tone === "mint" ? "text-[#15803d]" : "text-[#14261c]"}`}>{value}</p>
      <div className={`text-[10px] ${toneText}`}>{foot}</div>
    </div>
  );
}
