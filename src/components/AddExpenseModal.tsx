import { useState, useEffect, useRef } from "react";
import { CATEGORIES, today, uid } from "../lib";
import type { Category, Expense } from "../types";

export function AddExpenseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: Expense) => void }) {
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
    `h-11 w-full rounded-[9px] border px-3.5 text-gray-800 placeholder:text-gray-500 bg-gray-50 transition-colors focus:outline-none ${
      hasError ? "border-red-500/50" : "border-amber-300/30 focus:border-amber-500/50"
    }`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#14261cb3] p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md rounded-[17px] border border-amber-300/30 p-6 shadow-lg animate-in zoom-in-95 slide-in-from-bottom-2 fade-in duration-250" style={{ background: "linear-gradient(145deg, #fff8e6, #fffaf0)" }} onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.6px] text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Add Expense</h2>
            <p className="mt-1 text-[12px] text-gray-600">Record a new transaction — validated by the backend</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-gray-600 transition-colors hover:bg-amber-100 hover:text-gray-900" aria-label="Close">
            <i className="bi bi-x-lg text-gray-500" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-[11px] font-semibold text-[#5c6e63]">Date</label>
            <input type="date" value={form.date} max={today()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={`${fieldCls(false)} [color-scheme:light]`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-[11px] font-semibold text-[#5c6e63]">Amount (Nu.)</label>
              <input ref={amountRef} type="number" placeholder="0.00" min="0" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className={`num ${fieldCls(!!errors.amount)}`} />
              {errors.amount && <p className="text-[11px] text-[#b91c1c]"><i className="bi bi-exclamation-circle mr-1" aria-hidden="true" />{errors.amount}</p>}
            </div>
            <div className="grid gap-1.5">
              <label className="text-[11px] font-semibold text-[#5c6e63]">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className={fieldCls(false)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className="text-[11px] font-semibold text-[#5c6e63]">Description</label>
            <input type="text" placeholder="What was this for?" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={fieldCls(!!errors.description)} />
            {errors.description && <p className="text-[11px] text-[#b91c1c]"><i className="bi bi-exclamation-circle mr-1" aria-hidden="true" />{errors.description}</p>}
          </div>
          <div className="mt-1 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-[9px] border border-amber-300/30 bg-amber-100 px-4 text-[12px] font-bold text-gray-900 transition-all hover:-translate-y-0.5 hover:border-amber-300">
              Cancel
            </button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-[#3a2703] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: "linear-gradient(135deg, #f97316, #fabf30)" }}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
