type View = "dashboard" | "transactions";

export function Sidebar({ view, setView, onExport, onClear, onUndo, canUndo }: {
  view: View;
  setView: (v: View) => void;
  onExport: () => void;
  onClear: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-2.5 self-start px-1.5">
        <span className="brand-mark">
          <img src="/logo.png" alt="Teru Care" className="w-[34px] h-[34px] object-contain" />
        </span>
        <span className="brand-word text-[19px] font-bold tracking-[-0.9px] text-[#14261c]" style={{ fontFamily: "var(--font-display)" }}>
          Teru Care<span className="text-[#f97316]">.</span>
        </span>
      </div>

      <p className="sidebar-label px-4.5 pt-11 pb-3 text-[10px] font-bold tracking-[2px] text-[#5c6e63]">MENU</p>
      <nav className="nav-list flex flex-col gap-1.5">
        <button onClick={() => setView("dashboard")} className={`nav-item ${view === "dashboard" ? "selected" : ""}`}>
          {view === "dashboard" && <span className="nav-indicator" />}
          <i className="bi bi-grid-1x2 text-[15px]" aria-hidden="true" />
          <span className="nav-label">Dashboard</span>
        </button>
        <button onClick={() => setView("transactions")} className={`nav-item ${view === "transactions" ? "selected" : ""}`}>
          {view === "transactions" && <span className="nav-indicator" />}
          <i className="bi bi-list-check text-[15px]" aria-hidden="true" />
          <span className="nav-label">Transactions</span>
        </button>
      </nav>

      <p className="sidebar-label px-4.5 pt-8 pb-3 text-[10px] font-bold tracking-[2px] text-[#5c6e63]">ACTIONS</p>
      <div className="nav-list flex flex-col gap-1.5">
        <button onClick={onExport} className="nav-item">
          <i className="bi bi-download text-[15px]" aria-hidden="true" />
          <span className="nav-label">Export CSV</span>
        </button>
        <button onClick={onUndo} className="nav-item disabled:opacity-40" disabled={!canUndo}>
          <i className="bi bi-arrow-counterclockwise text-[15px]" aria-hidden="true" />
          <span className="nav-label">Undo Last</span>
        </button>
        <button onClick={onClear} className="nav-item hover:text-[#dc2626]!">
          <i className="bi bi-trash3 text-[15px]" aria-hidden="true" />
          <span className="nav-label">Clear data</span>
        </button>
      </div>

      <div className="mt-auto">
        <div className="sidebar-bottom mx-1 mb-5 flex items-start gap-3 rounded-xl border border-[#e2e8e4] bg-[#fffaf0] p-3.5">
          <i className="bi bi-shield-check mt-0.5 text-[#f97316]" aria-hidden="true" />
          <div className="grid gap-1">
            <strong className="text-[12px] text-[#14261c]">Private by design</strong>
            <span className="text-[11px] leading-snug text-[#5c6e63]">Your data stays on this machine, stored by the local Java backend.</span>
          </div>
        </div>
        <div className="sidebar-bottom flex items-center gap-2.5 border-t border-[#e2e8e4] pt-5 px-1.5">
          <img src="/logo.png" alt="Teru Care" className="h-8 w-8 object-contain" />
          <div className="grid gap-0.5">
            <strong className="text-[11px] font-semibold text-[#14261c]">Teru Care</strong>
            <span className="text-[10px] text-[#5c6e63]">CSA201 · Group 1</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
