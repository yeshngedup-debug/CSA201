import { useMemo, useState } from "react";
import { formatAmount, formatDate, CAT_ICONS, categoryMarkStyle, CATEGORIES } from "../lib";
import type { Expense, Category } from "../types";
import { Footer } from "../components/Footer";

export function TransactionsView({ expenses, onDelete }: {
  expenses: Expense[];
  onDelete: (id: string) => void;
}) {
  const [filterCat, setFilterCat] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = filterCat === "All" || e.category === filterCat;
      const matchSearch = search === "" || e.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, filterCat, search]);

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.5px] text-[#14261c]">All Transactions</h2>
          <p className="mt-1 text-[12px] text-[#5c6e63]">
            {filtered.length} of {expenses.length} record{expenses.length === 1 ? "" : "s"}
            {filterCat !== "All" && <> · filtered to <span className="text-[#15803d]">{filterCat}</span></>}
            {search !== "" && <> · matching “{search}”</>}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <div className="flex h-10 min-w-44 flex-1 items-center gap-2.5 rounded-[9px] border border-[#e2e8e4] bg-white px-3.5 text-[#5c6e63] focus-within:border-[#f97316]">
          <i className="bi bi-search text-[13px]" aria-hidden="true" />
          <input type="text" placeholder="Search transactions..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border-0 bg-transparent text-[12px] text-[#14261c] placeholder:text-[#5c6e63] focus:outline-none" />
          {search !== "" && (
            <button onClick={() => setSearch("")} className="text-[#5c6e63] hover:text-[#14261c]" aria-label="Clear search">
              <i className="bi bi-x-circle text-[12px]" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat as Category | "All")}
              className={`h-10 rounded-[9px] border px-3.5 text-[11px] font-bold transition-all ${
                filterCat === cat
                  ? "border-[#f9731640] bg-[#fff3cd] text-[#c2410c]"
                  : "border-[#e2e8e4] bg-white text-[#5c6e63] hover:border-[#f9731666] hover:text-[#14261c]"
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="panel px-6 py-2">
        {filtered.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <i className="bi bi-inbox text-3xl text-[#5c6e63]" aria-hidden="true" />
            <h3 className="mt-3 text-[18px] font-semibold text-[#14261c]">No transactions found</h3>
            <p className="mt-1 text-[12px] text-[#5c6e63]">Try a different search or category filter.</p>
          </div>
        ) : (
          <>
            {filtered.map(exp => (
              <div key={exp.id} className="group flex items-center gap-3.5 border-b border-[#e2e8e4] py-4 last:border-0">
                <span className="category-mark text-[17px]" style={categoryMarkStyle(exp.category)} aria-hidden="true">
                  <i className={`bi ${CAT_ICONS[exp.category] ?? "bi-pin"}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#14261c]">{exp.description}</p>
                  <p className="mt-1 truncate text-[11px] text-[#5c6e63]">{formatDate(exp.date)} <i className="mx-1.5 not-italic text-[#a8b5ad]">·</i> <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">{exp.category}</span></p>
                </div>
                <span className="num whitespace-nowrap text-[13px] font-semibold text-[#14261c]">-{formatAmount(exp.amount)}</span>
                <button onClick={() => onDelete(exp.id)} type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#5c6e63] opacity-0 transition-all hover:bg-red-50 hover:text-[#dc2626] group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Delete ${exp.description}`}>
                  <i className="bi bi-trash3 text-[13px]" aria-hidden="true" />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[#e2e8e4] py-4">
              <span className="text-[12px] font-semibold text-[#5c6e63]">Total ({filtered.length} record{filtered.length === 1 ? "" : "s"})</span>
              <span className="num text-[17px] font-semibold text-[#15803d]">{formatAmount(filtered.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
