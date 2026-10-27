import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import "bootstrap-icons/font/bootstrap-icons.css";
import * as api from "./api";
import type { ApiExpense } from "./api";

// ─── Types ────────────────────────────────────────────────────────────

type Category = "Food" | "Transport" | "Entertainment" | "Shopping" | "Health" | "Education" | "Utilities" | "Other";

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface Insight {
  icon: string;
  variant: "mint" | "warning" | "neutral";
  title: string;
  text: string;
}

// The backend stores expenses as ApiExpense; the shape matches Expense
// (category is a plain string there), so conversion is a safe cast.
function fromApi(e: ApiExpense): Expense {
  return e as unknown as Expense;
}

// ─── Constants ────────────────────────────────────────────────────────

const CATEGORIES: Category[] = ["Food", "Transport", "Entertainment", "Shopping", "Health", "Education", "Utilities", "Other"];

const CAT_COLORS: Record<Category, string> = {
  Food: "#74f6c8", Transport: "#80baff", Entertainment: "#a49cff",
  Shopping: "#f4bf8b", Health: "#ffa0a8", Education: "#6fd9e7",
  Utilities: "#ffb47f", Other: "#8ea3c0",
};

const CAT_ICONS: Record<Category, string> = {
  Food: "bi-cup-hot",
  Transport: "bi-bus-front",
  Entertainment: "bi-film",
  Shopping: "bi-bag",
  Health: "bi-heart-pulse",
  Education: "bi-book",
  Utilities: "bi-lightning-charge",
  Other: "bi-box",
};

// ─── Helpers ──────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().slice(0, 10); }
function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatAmount(n: number): string { return `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }
function uid(): string { return Math.random().toString(36).slice(2, 10); }

// ─── Chart Tooltips ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="block text-[11px] text-[#9aaec3] mb-2 font-semibold uppercase tracking-wider">{label}</span>
      <span className="flex items-center gap-2 text-[11px] text-[#b8c7da]">
        <i className="w-1.5 h-1.5 rounded-full bg-mint inline-block" style={{ backgroundColor: "#74f6c8" }} />
        Spent <strong className="ml-auto text-white num">{formatAmount(payload[0].value)}</strong>
      </span>
    </div>
  );
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="block text-[11px] text-[#9aaec3] mb-1 font-semibold">{payload[0].name}</span>
      <span className="text-[12px] font-bold num" style={{ color: "#74f6c8" }}>{formatAmount(payload[0].value)}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      onDismiss(toasts[toasts.length - 1].id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-70 space-y-2 flex flex-col items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 max-w-[min(400px,calc(100vw-40px))] rounded-[10px] px-3.5 py-3 shadow-2xl border text-[12px] font-medium backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          t.type === "success" ? "border-[#74f6c833] bg-[#153734] text-[#def8ed]" :
          t.type === "error" ? "border-[#ffa0a833] bg-[#3a2229] text-[#ffd9dc]" :
          "border-[#a49cff33] bg-[#232844] text-[#e2e2ff]"
        }`}>
          <i className={`bi ${t.type === "success" ? "bi-check2-circle text-mint" : t.type === "error" ? "bi-x-circle text-[#ffa0a8]" : "bi-info-circle text-lavender"} text-base`} aria-hidden="true" />
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tone, featured, foot }: {
  label: string;
  value: string;
  icon: string;
  tone: "mint" | "lavender" | "blue" | "amber";
  featured?: boolean;
  foot?: React.ReactNode;
}) {
  const toneText = { mint: "text-mint", lavender: "text-lavender", blue: "text-[#80baff]", amber: "text-[#f4bf8b]" }[tone];
  const toneChip = { mint: "bg-[#5ecfa51a] text-mint", lavender: "bg-[#a49cff1a] text-lavender", blue: "bg-[#6fa7ff1a] text-[#80baff]", amber: "bg-[#f4bf8b1a] text-[#f4bf8b]" }[tone];

  if (featured) {
    return (
      <div className="stat-card stat-feature flex h-[156px] flex-col justify-between p-5">
        <div className="feature-glow" aria-hidden="true" />
        <div className="relative flex items-start justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[1.25px] text-[#a7d8cd]">{label}</span>
          <span className={`stat-icon text-[13px] ${toneChip}`}><i className={`bi ${icon}`} aria-hidden="true" /></span>
        </div>
        <p className="relative num text-[clamp(25px,2.3vw,37px)] font-semibold leading-none tracking-[-1.4px] text-[#f4f9ff] whitespace-nowrap">{value}</p>
        <div className="relative flex items-center justify-between gap-2 text-[10px] text-[#91bfb3]">{foot}</div>
      </div>
    );
  }

  return (
    <div className="stat-card flex h-[156px] flex-col justify-between p-5">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[1.25px] text-[#a3b3c9]">{label}</span>
        <span className={`stat-icon text-[13px] ${toneChip}`}><i className={`bi ${icon}`} aria-hidden="true" /></span>
      </div>
      <p className={`num text-[clamp(23px,2.15vw,34px)] font-semibold leading-none tracking-[-1.4px] whitespace-nowrap ${tone === "mint" ? "text-mint" : "text-[#f4f8ff]"}`}>{value}</p>
      <div className={`text-[10px] ${toneText}`}>{foot}</div>
    </div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const chip = {
    mint: "border-[#74f6c82b] bg-[#74f6c814] text-mint",
    warning: "border-[#f4bf8b29] bg-[#f4bf8b14] text-[#f4bf8b]",
    neutral: "border-[#a49cff29] bg-[#a49cff14] text-lavender",
  }[insight.variant];

  return (
    <div className="flex gap-4 rounded-[13px] border border-[#abc3e121] p-4 transition-colors hover:border-[#abc3e133]" style={{ background: "linear-gradient(128deg, rgba(33,51,77,0.75), rgba(19,34,56,0.7))" }}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border text-sm ${chip}`} aria-hidden="true">
        <i className={`bi ${insight.icon}`} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[13.5px] font-semibold leading-snug tracking-[-0.15px] text-[#ecf4fd]">{insight.title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#8da0ba]">{insight.text}</p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────

function Sidebar({ view, setView, onExport, onClear, onUndo, canUndo }: {
  view: "dashboard" | "transactions";
  setView: (v: "dashboard" | "transactions") => void;
  onExport: () => void;
  onClear: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-2.5 self-start px-1.5">
        <span className="brand-mark">
          <img src="/logo.png" alt="FinTrack" className="w-[34px] h-[34px] object-contain" />
        </span>
        <span className="brand-word text-[19px] font-bold tracking-[-0.9px] text-[#f4f9ff]" style={{ fontFamily: "var(--font-display)" }}>
          FinTrack<span className="text-mint">.</span>
        </span>
      </div>

      <p className="sidebar-label px-4.5 pt-11 pb-3 text-[10px] font-bold tracking-[2px] text-[#566b86]">MENU</p>
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

      <p className="sidebar-label px-4.5 pt-8 pb-3 text-[10px] font-bold tracking-[2px] text-[#566b86]">ACTIONS</p>
      <div className="nav-list flex flex-col gap-1.5">
        <button onClick={onExport} className="nav-item">
          <i className="bi bi-download text-[15px]" aria-hidden="true" />
          <span className="nav-label">Export CSV</span>
        </button>
        <button onClick={onUndo} className="nav-item disabled:opacity-40" disabled={!canUndo}>
          <i className="bi bi-arrow-counterclockwise text-[15px]" aria-hidden="true" />
          <span className="nav-label">Undo Last</span>
        </button>
        <button onClick={onClear} className="nav-item hover:text-[#ffa0a8]!">
          <i className="bi bi-trash3 text-[15px]" aria-hidden="true" />
          <span className="nav-label">Clear data</span>
        </button>
      </div>

      <div className="mt-auto">
        <div className="mx-1 mb-5 flex items-start gap-3 rounded-xl border border-[#72f2ca21] p-3.5" style={{ background: "linear-gradient(130deg, rgba(69,147,132,0.09), rgba(84,95,179,0.04))" }}>
          <i className="bi bi-shield-check mt-0.5 text-mint" aria-hidden="true" />
          <div className="grid gap-1">
            <strong className="text-[12px] text-[#dcf9ef]">Private by design</strong>
            <span className="text-[11px] leading-snug text-[#79988f]">Your data stays on this machine, stored by the local Java backend.</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-t border-line pt-5 px-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] text-[15px] font-bold text-[#13253a]" style={{ background: "linear-gradient(135deg,#8df7d1,#6a9fb8)", fontFamily: "var(--font-display)" }}>T</span>
          <div className="grid gap-0.5">
            <strong className="text-[11px] font-semibold text-[#dce7f6]">Teru Care</strong>
            <span className="text-[10px] text-[#687d98]">CSA201 · Group 1</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────

function AddExpenseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: Expense) => void }) {
  const [form, setForm] = useState({ date: today(), amount: "", category: "Food" as Category, description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.amount || Number(form.amount) <= 0) errs.amount = "Amount must be greater than 0";
    if (!form.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onAdd({ id: uid(), date: form.date, amount: Number(form.amount), category: form.category, description: form.description.trim() });
    onClose();
  };

  const fieldCls = (hasError: boolean) =>
    `h-11 w-full rounded-[9px] border px-3.5 text-[13px] text-[#edf5ff] placeholder:text-[#687e99] bg-[#102038] transition-colors focus:outline-none ${
      hasError ? "border-[#ffa0a866]" : "border-[#acc4e626] focus:border-[#74f6c88c]"
    }`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#030914bf] p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md rounded-[17px] border border-[#a5cce438] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.45)] animate-in zoom-in-95 slide-in-from-bottom-2 fade-in duration-250" style={{ background: "linear-gradient(145deg, #1b2c46, #101f35)" }} onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.6px] text-[#f0f5fd]" style={{ fontFamily: "var(--font-display)" }}>Add Expense</h2>
            <p className="mt-1 text-[12px] text-[#93a8bf]">Record a new transaction — validated by the backend</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[#8ba0b8] transition-colors hover:bg-[#74f6c817] hover:text-mint" aria-label="Close">
            <i className="bi bi-x-lg text-[13px]" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-[11px] font-semibold text-[#b8c7d8]">Date</label>
            <input type="date" value={form.date} max={today()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={`${fieldCls(false)} [color-scheme:dark]`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[11px] font-semibold text-[#b8c7d8]">Amount (Rs.)</label>
              <input ref={amountRef} type="number" placeholder="0.00" min="0" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className={`num ${fieldCls(!!errors.amount)}`} />
              {errors.amount && <p className="text-[11px] text-[#ffa9b0]"><i className="bi bi-exclamation-circle mr-1" aria-hidden="true" />{errors.amount}</p>}
            </div>
            <div className="grid gap-1.5">
              <label className="text-[11px] font-semibold text-[#b8c7d8]">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className={fieldCls(false)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className="text-[11px] font-semibold text-[#b8c7d8]">Description</label>
            <input type="text" placeholder="What was this for?" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={fieldCls(!!errors.description)} />
            {errors.description && <p className="text-[11px] text-[#ffa9b0]"><i className="bi bi-exclamation-circle mr-1" aria-hidden="true" />{errors.description}</p>}
          </div>
          <div className="mt-1 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-[9px] border border-[#b7cce72b] bg-[#19273d94] px-4 text-[12px] font-bold text-[#c8d7e9] transition-all hover:-translate-y-0.5 hover:border-[#74f6c85c]">
              Cancel
            </button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-[#09231f] shadow-[0_6px_24px_rgba(80,230,181,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,230,181,0.23)]"
              style={{ background: "linear-gradient(135deg, #93fbd9, #68e6c3)" }}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [view, setView] = useState<"dashboard" | "transactions">("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Load the expense list from the Java backend on mount.
  useEffect(() => {
    api.fetchExpenses()
      .then(res => {
        setExpenses(res.expenses.map(fromApi));
        setCanUndo(res.canUndo);
      })
      .catch((err: Error) => {
        setToasts(t => [...t, { id: uid(), message: err.message, type: "error" }]);
      });
  }, []);

  const addExpense = useCallback((e: Expense) => {
    api.addExpense({ id: e.id, date: e.date, amount: e.amount, category: e.category, description: e.description })
      .then(saved => {
        setExpenses(prev => [fromApi(saved), ...prev]);
        setCanUndo(true);
        setToasts(t => [...t, { id: uid(), message: `${saved.description} — ${formatAmount(saved.amount)} added`, type: "success" }]);
      })
      .catch((err: Error) => {
        setToasts(t => [...t, { id: uid(), message: err.message, type: "error" }]);
      });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    api.deleteExpense(id)
      .then(removed => {
        setExpenses(prev => prev.filter(e => e.id !== id));
        setCanUndo(true);
        setToasts(t => [...t, { id: uid(), message: "Transaction removed", type: "info" }]);
      })
      .catch((err: Error) => {
        setToasts(t => [...t, { id: uid(), message: err.message, type: "error" }]);
      });
  }, []);

  const undoLast = useCallback(() => {
    api.undoLast()
      .then(res => {
        const exp = fromApi(res.expense);
        if (res.action === "restored") {
          setExpenses(prev => [exp, ...prev]);
        } else if (res.action === "removed") {
          setExpenses(prev => prev.filter(e => e.id !== exp.id));
        } // "skipped": the expense was re-added under the same id — leave the list alone
        setCanUndo(res.canUndo);
        setToasts(t => [...t, { id: uid(), message: res.action === "skipped" ? "Nothing to undo" : `${exp.description} ${res.action}`, type: "info" }]);
      })
      .catch((err: Error) => {
        setToasts(t => [...t, { id: uid(), message: err.message, type: "error" }]);
      });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const exportCSV = useCallback(() => {
    const header = "Date,Description,Category,Amount\n";
    const rows = expenses.map(e => `${e.date},${e.description},${e.category},${e.amount}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "fintrack-export.csv"; a.click();
    URL.revokeObjectURL(url);
    setToasts(t => [...t, { id: uid(), message: "CSV exported", type: "success" }]);
  }, [expenses]);

  const clearAll = useCallback(() => {
    api.clearAllExpenses()
      .then(() => {
        setExpenses([]);
        setCanUndo(false);
        setToasts(t => [...t, { id: uid(), message: "All data cleared", type: "info" }]);
      })
      .catch((err: Error) => {
        setToasts(t => [...t, { id: uid(), message: err.message, type: "error" }]);
      });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShowModal(true); }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undoLast(); }
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoLast]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = filterCat === "All" || e.category === filterCat;
      const matchSearch = search === "" || e.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, filterCat, search]);

  // The "month in focus" — the month of the most recent expense. The header
  // pill, the This Month card, and the trend chart all read from this single
  // source so they can never disagree.
  const monthKey = useMemo(() => (expenses[0]?.date ?? today()).slice(0, 7), [expenses]);
  const monthLabel = useMemo(
    () => new Date(monthKey + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [monthKey],
  );

  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const thisMonth = expenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
    const avg = expenses.length > 0 ? Math.round(total / expenses.length) : 0;
    const top = Object.entries(expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>))
      .sort((a, b) => b[1] - a[1])[0];
    return { total, thisMonth, avg, topCat: top?.[0] || "—", topAmount: top?.[1] || 0 };
  }, [expenses, monthKey]);

  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    expenses.filter(e => e.date.startsWith(monthKey)).forEach(e => { days[e.date] = (days[e.date] || 0) + e.amount; });
    return Object.entries(days).map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [expenses, monthKey]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const insights = useMemo<Insight[]>(() => {
    if (expenses.length === 0) return [];
    const biggest = expenses.reduce((a, b) => (b.amount > a.amount ? b : a));
    const dayMap: Record<string, number> = {};
    expenses.forEach(e => { dayMap[e.date] = (dayMap[e.date] || 0) + e.amount; });
    const busiest = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
    const activeDays = Object.keys(dayMap).length;
    const dailyPace = activeDays > 0 ? Math.round(stats.total / activeDays) : 0;
    const topShare = stats.total > 0 ? Math.round((stats.topAmount / stats.total) * 100) : 0;
    return [
      {
        icon: "bi-trophy", variant: "mint",
        title: `${stats.topCat} leads your spending`,
        text: `${formatAmount(stats.topAmount)} — ${topShare}% of everything you spent.`,
      },
      {
        icon: "bi-arrow-up-right", variant: "warning",
        title: `Largest expense: ${biggest.description}`,
        text: `${formatAmount(biggest.amount)} on ${formatDate(biggest.date)} · ${biggest.category}`,
      },
      {
        icon: "bi-calendar3", variant: "neutral",
        title: `Daily pace across ${activeDays} active day${activeDays === 1 ? "" : "s"}`,
        text: `About ${formatAmount(dailyPace)} per day. Busiest day: ${formatDate(busiest[0])} (${formatAmount(busiest[1])}).`,
      },
    ];
  }, [expenses, stats]);

  const categoryMarkStyle = (cat: string): React.CSSProperties => {
    const color = CAT_COLORS[cat as Category] ?? "#8ea3c0";
    return { color, backgroundColor: `${color}17`, border: `1px solid ${color}2e` };
  };

  return (
    <div className="min-h-screen">
      <Sidebar view={view} setView={setView} onExport={exportCSV} onClear={clearAll} onUndo={undoLast} canUndo={canUndo} />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[#091323f5] px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-2.5">
          <span className="brand-mark h-8! w-8! flex-none! rounded-[9px]"><img src="/logo.png" alt="FinTrack" className="w-full h-full object-contain" /></span>
          <span className="text-[17px] font-bold tracking-[-0.9px] text-[#f4f9ff]" style={{ fontFamily: "var(--font-display)" }}>FinTrack<span className="text-mint">.</span></span>
        </div>
        <button onClick={() => setShowModal(true)} className="grid h-9 w-9 place-items-center rounded-[9px] text-[#09231f]" style={{ background: "linear-gradient(135deg,#93fbd9,#68e6c3)" }} aria-label="Add expense">
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      </div>

      <main className="main-content view-in" key={view}>
        {/* Page header */}
        <header className="mb-7 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.8px] text-[#7dbaa9]">
              <span className="live-dot" aria-hidden="true" />
              FinTrack <span className="text-[#465b76]">/</span> {view === "dashboard" ? "Overview" : "Ledger"}
            </p>
            <h1 className="mt-2.5 text-[clamp(26px,2.55vw,38px)] font-semibold leading-[1.16] tracking-[-1.35px] text-[#f0f5fd]">
              {view === "dashboard" ? "Track every expense." : "Every rupee,"}
              <br className="hidden sm:block" />
              {view === "dashboard" ? " Understand your month." : " accounted for."}
            </h1>
            <p className="mt-1.5 text-[13px] text-[#8d9eb6]">
              {view === "dashboard"
                ? "Review your total spending, recent transactions, and category breakdown in one place."
                : "Search, filter, and manage every transaction recorded in the system."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pt-1.5">
            <span className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#a6bee10d] bg-[#17243ad1] px-4 text-[12px] font-semibold text-[#e1ebf7]">
              <i className="bi bi-calendar3 text-[#7d91aa]" aria-hidden="true" />
              {monthLabel}
            </span>
            <button onClick={() => setShowModal(true)} className="hidden h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-[#09231f] shadow-[0_6px_24px_rgba(80,230,181,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,230,181,0.23)] sm:inline-flex"
              style={{ background: "linear-gradient(135deg, #93fbd9, #68e6c3)" }}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add Expense
            </button>
          </div>
        </header>

        {view === "dashboard" && (
          <div className="mx-auto max-w-[1500px]">
            {expenses.length === 0 ? (
              <div className="panel flex min-h-[320px] flex-col items-center justify-center text-center">
                <span className="stat-icon h-12 w-12 text-xl"><i className="bi bi-wallet2" aria-hidden="true" /></span>
                <h3 className="mt-4 text-[18px] font-semibold text-[#e1eaf6]">No expenses yet</h3>
                <p className="mt-1 text-[12px] text-[#8094ae]">Add your first expense and the dashboard will come to life.</p>
                <button onClick={() => setShowModal(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-[#09231f]" style={{ background: "linear-gradient(135deg,#93fbd9,#68e6c3)" }}>
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Add first expense
                </button>
              </div>
            ) : (
              <>
                {/* Stat grid */}
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.22fr_1fr_1fr_1fr]">
                  <StatCard
                    featured label="Total Spent" value={formatAmount(stats.total)} icon="bi-wallet2" tone="mint"
                    foot={
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#85ffd429] bg-[#58d6aa1a] px-2 py-1 text-[10px] text-[#b5efdb]">
                          <span className="live-dot h-[5px]! w-[5px]!" aria-hidden="true" /> Live tracking
                        </span>
                        <span>across {expenses.length} expense{expenses.length === 1 ? "" : "s"}</span>
                      </>
                    }
                  />
                  <StatCard label="This Month" value={formatAmount(stats.thisMonth)} icon="bi-calendar3" tone="mint"
                    foot={<span>{monthLabel} spending</span>} />
                  <StatCard label="Top Category" value={stats.topCat} icon="bi-trophy" tone="lavender"
                    foot={<span>{formatAmount(stats.topAmount)} total</span>} />
                  <StatCard label="Avg. Entry" value={formatAmount(stats.avg)} icon="bi-bar-chart-line" tone="blue"
                    foot={<span>per transaction</span>} />
                </div>

                {/* Analytics grid: trend + ring */}
                <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.57fr)_minmax(340px,1fr)]">
                  <div className="panel flex h-[368px] flex-col p-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#ebf1f9]">Spending trend</h2>
                        <p className="mt-0.5 text-[11px] text-[#8192ab]">Daily expenses this month</p>
                      </div>
                      <div className="flex items-center gap-4 pt-1 text-[11px] text-[#b1bfd1]">
                        <span className="flex items-center gap-1.5"><i className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: "#74f6c8" }} />Daily spend</span>
                      </div>
                    </div>
                    <div className="mt-3 min-h-0 flex-1">
                      {dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={248}>
                          <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradMint" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#74f6c8" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#74f6c8" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#465b76" tick={{ fontSize: 11, fill: "#5c718f" }} tickLine={false} axisLine={false} />
                            <YAxis stroke="#465b76" tick={{ fontSize: 11, fill: "#5c718f" }} tickLine={false} axisLine={false} tickFormatter={v => `Rs.${v}`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#74f6c8", strokeOpacity: 0.2, strokeDasharray: "4 4" }} />
                            <Area type="monotone" dataKey="amount" stroke="#74f6c8" strokeWidth={2.5} fill="url(#gradMint)" activeDot={{ r: 5, fill: "#74f6c8", stroke: "#0b1829", strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="grid h-[248px] place-items-center rounded-xl border border-dashed border-[#abc3e11f] text-[#7890ab]">
                          <div className="text-center">
                            <i className="bi bi-graph-up-arrow text-3xl" aria-hidden="true" />
                            <p className="mt-2 text-[12px]">No spending data this month</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel flex h-[368px] flex-col p-6 pb-4">
                    <div>
                      <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#ebf1f9]">By category</h2>
                      <p className="mt-0.5 text-[11px] text-[#8192ab]">Where the money went</p>
                    </div>
                    {pieData.length > 0 ? (
                      <div className="mt-2 flex min-h-0 flex-1 items-center gap-5">
                        <div className="relative grid w-[46%] shrink-0 place-items-center">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none" animationBegin={0} animationDuration={900}>
                                {pieData.map((entry, i) => (
                                  <Cell key={i} fill={CAT_COLORS[entry.name as Category] ?? "#8ea3c0"} />
                                ))}
                              </Pie>
                              <Tooltip content={<DonutTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 grid place-items-center">
                            <div className="text-center">
                              <span className="block text-[9px] font-bold tracking-[1px] text-[#8a9bb2]">TOTAL</span>
                              <strong className="num mt-1 block text-[17px] font-semibold tracking-[-0.7px] text-[#f4f9ff]">{formatAmount(stats.total)}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2 overflow-y-auto pr-1">
                          {pieData.map(item => (
                            <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="flex min-w-0 items-center gap-2 text-[#b2c1d4]">
                                <i className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: CAT_COLORS[item.name as Category] ?? "#8ea3c0" }} />
                                <span className="truncate">{item.name}</span>
                              </span>
                              <span className="num shrink-0 font-bold text-[#ebf3fc]">{formatAmount(item.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid flex-1 place-items-center text-[12px] text-[#7890ab]">No data</div>
                    )}
                    <button onClick={() => setView("transactions")} className="mt-auto self-start pt-2 text-[11px] font-bold text-[#8becd2] transition-colors hover:text-[#c1ffeb]">
                      View all transactions <i className="bi bi-arrow-right ml-1" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Lower grid: insights + recent */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="panel min-h-[245px] p-6">
                    <div>
                      <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#ebf1f9]">Insights</h2>
                      <p className="mt-0.5 text-[11px] text-[#8192ab]">What your spending says</p>
                    </div>
                    <div className="mt-4 grid gap-2.5">
                      {insights.map(ins => <InsightCard key={ins.title} insight={ins} />)}
                    </div>
                  </div>

                  <div className="panel min-h-[245px] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#ebf1f9]">Recent</h2>
                        <p className="mt-0.5 text-[11px] text-[#8192ab]">Latest transactions</p>
                      </div>
                      <button onClick={() => setView("transactions")} className="text-[11px] font-bold text-[#8becd2] transition-colors hover:text-[#c1ffeb]">
                        View all <i className="bi bi-arrow-right ml-0.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2">
                      {expenses.slice(0, 5).map(exp => (
                        <div key={exp.id} className="group flex items-center gap-3 border-b border-line py-3 last:border-0">
                          <span className="category-mark h-10! w-10! text-[15px]" style={categoryMarkStyle(exp.category)} aria-hidden="true">
                            <i className={`bi ${CAT_ICONS[exp.category] ?? "bi-pin"}`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-[#e0eaf6]">{exp.description}</p>
                            <p className="mt-0.5 truncate text-[10px] text-[#8294ad]">{formatDate(exp.date)} <i className="mx-1 not-italic text-[#536984]">·</i> {exp.category}</p>
                          </div>
                          <span className="num text-[13px] font-semibold text-[#84eccb] whitespace-nowrap">-{formatAmount(exp.amount)}</span>
                          <button onClick={() => deleteExpense(exp.id)} type="button"
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#8ba0b8] opacity-0 transition-all hover:bg-[#74f6c817] hover:text-mint group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`Delete ${exp.description}`}>
                            <i className="bi bi-trash3 text-[13px]" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 pb-2 pt-3 text-[10px] text-[#61738e]">
                  <span>© 2026 FinTrack · Teru Care — CSA201 Group 1 · <strong className="font-semibold text-[#7d92ad]">Ctrl+N</strong> new · <strong className="font-semibold text-[#7d92ad]">Ctrl+Z</strong> undo · <strong className="font-semibold text-[#7d92ad]">Esc</strong> close</span>
                  <span className="flex items-center gap-1.5">
                    <span className="live-dot h-[5px]! w-[5px]!" aria-hidden="true" /> Java backend live on :8090
                  </span>
                </footer>
              </>
            )}
          </div>
        )}

        {view === "transactions" && (
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-semibold tracking-[-0.5px] text-[#eef5fd]">All Transactions</h2>
                <p className="mt-1 text-[12px] text-[#8d9eb7]">
                  {filtered.length} of {expenses.length} record{expenses.length === 1 ? "" : "s"}
                  {filterCat !== "All" && <> · filtered to <span className="text-[#9ccfbe]">{filterCat}</span></>}
                  {search !== "" && <> · matching “{search}”</>}
                </p>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2.5">
              <div className="flex h-10 min-w-44 flex-1 items-center gap-2.5 rounded-[9px] border border-[#acc4e624] bg-[#0711206b] px-3.5 text-[#8095ae] focus-within:border-[#74f6c88c]">
                <i className="bi bi-search text-[13px]" aria-hidden="true" />
                <input type="text" placeholder="Search transactions..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border-0 bg-transparent text-[12px] text-[#edf5ff] placeholder:text-[#687e99] focus:outline-none" />
                {search !== "" && (
                  <button onClick={() => setSearch("")} className="text-[#8095ae] hover:text-mint" aria-label="Clear search">
                    <i className="bi bi-x-circle text-[12px]" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["All", ...CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat as Category | "All")}
                    className={`h-10 rounded-[9px] border px-3.5 text-[11px] font-bold transition-all ${
                      filterCat === cat
                        ? "border-[#74f6c833] bg-[#74f6c81a] text-[#98ffe0]"
                        : "border-[#abc3e114] bg-[#ffffff0b] text-[#8ca0b8] hover:border-[#74f6c85c] hover:text-[#e6eefc]"
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel px-6 py-2">
              {filtered.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                  <i className="bi bi-inbox text-3xl text-[#7890ab]" aria-hidden="true" />
                  <h3 className="mt-3 text-[18px] font-semibold text-[#e1eaf6]">No transactions found</h3>
                  <p className="mt-1 text-[12px] text-[#8094ae]">Try a different search or category filter.</p>
                </div>
              ) : (
                <>
                  {filtered.map(exp => (
                    <div key={exp.id} className="group flex items-center gap-3.5 border-b border-line py-4 last:border-0">
                      <span className="category-mark text-[17px]" style={categoryMarkStyle(exp.category)} aria-hidden="true">
                        <i className={`bi ${CAT_ICONS[exp.category] ?? "bi-pin"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#e0eaf6]">{exp.description}</p>
                        <p className="mt-1 truncate text-[11px] text-[#8294ad]">{formatDate(exp.date)} <i className="mx-1.5 not-italic text-[#536984]">·</i> <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">{exp.category}</span></p>
                      </div>
                      <span className="num whitespace-nowrap text-[13px] font-semibold text-[#ebf2fc]">-{formatAmount(exp.amount)}</span>
                      <button onClick={() => deleteExpense(exp.id)} type="button"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#8ba0b8] opacity-0 transition-all hover:bg-[#ffa0a81f] hover:text-[#ffa0a8] group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Delete ${exp.description}`}>
                        <i className="bi bi-trash3 text-[13px]" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-line py-4">
                    <span className="text-[12px] font-semibold text-[#8399af]">Total ({filtered.length} record{filtered.length === 1 ? "" : "s"})</span>
                    <span className="num text-[17px] font-semibold text-[#84eccb]">{formatAmount(filtered.reduce((s, e) => s + e.amount, 0))}</span>
                  </div>
                </>
              )}
            </div>

            <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 pb-2 pt-3 text-[10px] text-[#61738e]">
              <span>© 2026 FinTrack · Teru Care — CSA201 Group 1 · <strong className="font-semibold text-[#7d92ad]">Ctrl+N</strong> new · <strong className="font-semibold text-[#7d92ad]">Ctrl+Z</strong> undo · <strong className="font-semibold text-[#7d92ad]">Esc</strong> close</span>
              <span className="flex items-center gap-1.5">
                <span className="live-dot h-[5px]! w-[5px]!" aria-hidden="true" /> Java backend live on :8090
              </span>
            </footer>
          </div>
        )}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tabbar" aria-label="Primary">
        <button onClick={() => setView("dashboard")} className={`flex min-w-14 flex-col items-center justify-center gap-0.5 text-[9px] ${view === "dashboard" ? "text-mint" : "text-[#7990aa]"}`}>
          <i className="bi bi-grid-1x2 text-[16px]" aria-hidden="true" /> Dashboard
        </button>
        <button onClick={() => setShowModal(true)} className="flex min-w-14 flex-col items-center justify-center gap-0.5 text-[9px] text-[#7990aa]">
          <i className="bi bi-plus-circle text-[16px]" aria-hidden="true" /> Add
        </button>
        <button onClick={() => setView("transactions")} className={`flex min-w-14 flex-col items-center justify-center gap-0.5 text-[9px] ${view === "transactions" ? "text-mint" : "text-[#7990aa]"}`}>
          <i className="bi bi-list-check text-[16px]" aria-hidden="true" /> Ledger
        </button>
      </nav>

      {showModal && <AddExpenseModal onClose={() => setShowModal(false)} onAdd={addExpense} />}
      {toasts.length > 0 && <ToastContainer toasts={toasts} onDismiss={dismissToast} />}
    </div>
  );
}
