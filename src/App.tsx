import { useState, useMemo, useCallback, useEffect } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import * as api from "./api";
import { fromApi } from "./types";
import type { Expense, Toast } from "./types";
import { today, uid, formatAmount } from "./lib";
import { Sidebar } from "./components/Sidebar";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { ToastContainer } from "./components/Toast";
import { DashboardView } from "./views/DashboardView";
import { TransactionsView } from "./views/TransactionsView";

// ─── Main App ─────────────────────────────────────────────────────────
// State + wiring only. View markup lives in src/views/*, reusable pieces
// in src/components/*, and constants/helpers in src/lib.ts.

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [view, setView] = useState<"dashboard" | "transactions">("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [apiOffline, setApiOffline] = useState(false);

  // Load the expense list from the Java backend on mount.
  useEffect(() => {
    api.fetchExpenses()
      .then(res => {
        setExpenses(res.expenses.map(fromApi));
        setCanUndo(res.canUndo);
      })
      .catch((err: Error) => {
        setApiOffline(true);
        setToasts(t => [...t, { id: uid(), message: err.message, type: "error" }]);
      });
  }, []);

  const addExpense = useCallback((e: Expense) => {
    api.addExpense({ id: e.id, date: e.date, amount: e.amount, category: e.category, description: e.description })
      .then(saved => {
        setExpenses(prev => [fromApi(saved), ...prev]);
        setCanUndo(true);
        setApiOffline(false); // successful call → API is reachable
        setToasts(t => [...t, { id: uid(), message: `${saved.description} — ${formatAmount(saved.amount)} added`, type: "success" }]);
      })
      .catch((err: Error) => {
        setApiOffline(true);
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
    a.href = url; a.download = "teru-care-export.csv"; a.click();
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

  // The "month in focus" — the month of the most recent expense. The header
  // pill reads from this single source so it can never disagree with the views.
  const monthKey = useMemo(() => (expenses[0]?.date ?? today()).slice(0, 7), [expenses]);
  const monthLabel = useMemo(
    () => new Date(monthKey + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [monthKey],
  );

  return (
    <div className="min-h-screen">
      <Sidebar view={view} setView={setView} onExport={exportCSV} onClear={clearAll} onUndo={undoLast} canUndo={canUndo} />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e2e8e4] bg-[#fff8e6f5] px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-2.5">
          <span className="brand-mark h-8! w-8! flex-none! rounded-[9px]"><img src="/logo.png" alt="Teru Care" className="w-full h-full object-contain" /></span>
          <span className="text-[17px] font-bold tracking-[-0.9px] text-[#14261c]" style={{ fontFamily: "var(--font-display)" }}>Teru Care<span className="text-[#f97316]">.</span></span>
        </div>
        <button onClick={() => setShowModal(true)} className="grid h-9 w-9 place-items-center rounded-[9px] text-[#3a2703]" style={{ background: "linear-gradient(135deg,#f97316,#fabf30)" }} aria-label="Add expense">
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      </div>

      <main className="main-content view-in" key={view}>
        {/* Page header */}
        <header className="mb-7 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.8px] text-gray-600">
              <span className="live-dot" aria-hidden="true" />
              Teru Care <span className="text-[#5c6e63]">/</span> {view === "dashboard" ? "Overview" : "Ledger"}
            </p>
            <h1 className="mt-2.5 text-[clamp(26px,2.55vw,38px)] font-semibold leading-[1.16] tracking-[-1.35px] text-gray-900">
              {view === "dashboard" ? "Track every expense." : "Every rupee,"}
              <br className="hidden sm:block" />
              {view === "dashboard" ? " Understand your month." : " accounted for."}
            </h1>
            <p className="mt-1.5 text-[13px] text-gray-600">
              {view === "dashboard"
                ? "Review your total spending, recent transactions, and category breakdown in one place."
                : "Search, filter, and manage every transaction recorded in the system."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pt-1.5">
            <span className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-amber-300/30 bg-amber-100 px-4 text-[12px] font-semibold text-gray-900">
              <i className="bi bi-calendar3 text-gray-500" aria-hidden="true" />
              {monthLabel}
            </span>
            <button onClick={() => setShowModal(true)} className="hidden h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-[#3a2703] sm:inline-flex shadow-md transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#f97316,#fabf30)" }}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add Expense
            </button>
          </div>
        </header>

        {view === "dashboard" ? (
          <DashboardView
            expenses={expenses}
            monthLabel={monthLabel}
            apiOffline={apiOffline}
            onAdd={() => setShowModal(true)}
            onDelete={deleteExpense}
            onGoTransactions={() => setView("transactions")}
          />
        ) : (
          <TransactionsView expenses={expenses} onDelete={deleteExpense} />
        )}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tabbar" aria-label="Primary">
        <button onClick={() => setView("dashboard")} className={`flex min-w-14 flex-col items-center justify-center gap-0.5 text-[9px] ${view === "dashboard" ? "text-[#c2410c]" : "text-[#5c6e63]"}`}>
          <i className="bi bi-grid-1x2 text-[16px]" aria-hidden="true" /> Dashboard
        </button>
        <button onClick={() => setShowModal(true)} className="flex min-w-14 flex-col items-center justify-center gap-0.5 text-[9px] text-[#5c6e63]">
          <i className="bi bi-plus-circle text-[16px]" aria-hidden="true" /> Add
        </button>
        <button onClick={() => setView("transactions")} className={`flex min-w-14 flex-col items-center justify-center gap-0.5 text-[9px] ${view === "transactions" ? "text-[#c2410c]" : "text-[#5c6e63]"}`}>
          <i className="bi bi-list-check text-[16px]" aria-hidden="true" /> Ledger
        </button>
      </nav>

      {showModal && <AddExpenseModal onClose={() => setShowModal(false)} onAdd={addExpense} />}
      {toasts.length > 0 && <ToastContainer toasts={toasts} onDismiss={dismissToast} />}
    </div>
  );
}
