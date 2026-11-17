import { useMemo } from "react";
import { formatAmount, formatDate, CAT_ICONS, categoryMarkStyle, today } from "../lib";
import type { Expense, Insight } from "../types";
import { StatCard } from "../components/StatCard";
import { InsightCard } from "../components/InsightCard";
import { SpendingTrend, CategoryDonut } from "../components/Charts";
import { Footer } from "../components/Footer";

export function DashboardView({ expenses, monthLabel, apiOffline, onAdd, onDelete, onGoTransactions }: {
  expenses: Expense[];
  monthLabel: string;
  apiOffline: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onGoTransactions: () => void;
}) {
  const monthKey = (expenses[0]?.date ?? today()).slice(0, 7);

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

  return (
    <div className="mx-auto max-w-[1500px]">
      {expenses.length === 0 ? (
        apiOffline ? (
          <div className="panel flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center border border-[#eab30855] bg-[#fff3cd]">
            <i className="bi bi-plug-fill text-[26px] text-[#c2410c]" aria-hidden="true" />
            <h3 className="text-[17px] font-semibold text-[#14261c]">Can&apos;t reach the backend</h3>
            <p className="text-[12px] text-[#5c6e63] max-w-md leading-relaxed">
              The dashboard is empty because the Java API is not responding at{" "}
              <code className="rounded border border-[#e2e8e4] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#c2410c]">localhost:8090</code>.
              Start it with{" "}<code className="rounded border border-[#e2e8e4] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#c2410c]">backend\run.bat</code>.
            </p>
          </div>
        ) : (
          <div className="panel flex min-h-[320px] flex-col items-center justify-center text-center">
            <span className="stat-icon h-12 w-12 text-xl"><i className="bi bi-wallet2" aria-hidden="true" /></span>
            <h3 className="mt-4 text-[18px] font-semibold text-[#14261c]">No expenses yet</h3>
            <p className="mt-1 text-[12px] text-[#5c6e63]">Add your first expense and the dashboard will come to life.</p>
            <button onClick={onAdd} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-[12px] font-bold text-[#3a2703] shadow-md transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#f97316,#fabf30)" }}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add first expense
            </button>
          </div>
        )
      ) : (
        <>
          {/* Stat grid */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.22fr_1fr_1fr_1fr]">
            <StatCard
              featured label="Total Spent" value={formatAmount(stats.total)} icon="bi-wallet2" tone="mint"
              foot={
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#15803d33] bg-[#15803d14] px-2 py-1 text-[10px] font-medium text-[#15803d]">
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
            <SpendingTrend data={dailyData} />
            <CategoryDonut data={pieData} total={stats.total} onViewAll={onGoTransactions} />
          </div>

          {/* Lower grid: insights + recent */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="panel min-h-[245px] p-6">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#14261c]">Insights</h2>
                <p className="mt-0.5 text-[11px] text-[#5c6e63]">What your spending says</p>
              </div>
              <div className="mt-4 grid gap-2.5">
                {insights.map(ins => <InsightCard key={ins.title} insight={ins} />)}
              </div>
            </div>

            <div className="panel min-h-[245px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#14261c]">Recent</h2>
                  <p className="mt-0.5 text-[11px] text-[#5c6e63]">Latest transactions</p>
                </div>
                <button onClick={onGoTransactions} className="text-[11px] font-bold text-[#c2410c] transition-colors hover:text-[#f97316]">
                  View all <i className="bi bi-arrow-right ml-0.5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2">
                {expenses.slice(0, 5).map(exp => (
                  <div key={exp.id} className="group flex items-center gap-3 border-b border-[#e2e8e4] py-3 last:border-0">
                    <span className="category-mark h-10! w-10! text-[15px]" style={categoryMarkStyle(exp.category)} aria-hidden="true">
                      <i className={`bi ${CAT_ICONS[exp.category] ?? "bi-pin"}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-[#14261c]">{exp.description}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#5c6e63]">{formatDate(exp.date)} <i className="mx-1 not-italic text-[#a8b5ad]">·</i> {exp.category}</p>
                    </div>
                    <span className="num text-[13px] font-semibold text-[#15803d] whitespace-nowrap">-{formatAmount(exp.amount)}</span>
                    <button onClick={() => onDelete(exp.id)} type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#5c6e63] opacity-0 transition-all hover:bg-red-50 hover:text-[#dc2626] group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Delete ${exp.description}`}>
                      <i className="bi bi-trash3 text-[13px]" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Footer />
        </>
      )}
    </div>
  );
}
