import type { Insight } from "../types";

export function InsightCard({ insight }: { insight: Insight }) {
  const chip = {
    mint: "border-[#15803d2b] bg-[#15803d14] text-[#15803d]",
    warning: "border-[#c2410c2b] bg-[#c2410c14] text-[#c2410c]",
    neutral: "border-[#7c3aed2b] bg-[#7c3aed14] text-[#7c3aed]",
  }[insight.variant];

  return (
    <div className="flex gap-4 rounded-[13px] border border-[#e2e8e4] bg-white p-4 transition-colors hover:border-amber-300">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border text-sm ${chip}`} aria-hidden="true">
        <i className={`bi ${insight.icon}`} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[13.5px] font-semibold leading-snug tracking-[-0.15px] text-[#14261c]">{insight.title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5c6e63]">{insight.text}</p>
      </div>
    </div>
  );
}
