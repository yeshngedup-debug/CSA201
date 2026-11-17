import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatAmount, CAT_COLORS } from "../lib";
import type { Category } from "../types";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="block text-[11px] text-gray-700 mb-2 font-semibold uppercase tracking-wider">{label}</span>
      <span className="flex items-center gap-2 text-[11px] text-gray-600">
        <i className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" style={{ backgroundColor: "#f97316" }} />
        Spent <strong className="ml-auto text-gray-900 num">{formatAmount(payload[0].value)}</strong>
      </span>
    </div>
  );
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="block text-[11px] text-gray-700 mb-1 font-semibold">{payload[0].name}</span>
      <span className="text-[12px] font-bold num" style={{ color: "#f97316" }}>{formatAmount(payload[0].value)}</span>
    </div>
  );
}

export interface TrendPoint { date: string; amount: number }
export interface PieSlice { name: string; value: number }

export function SpendingTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="panel flex h-[368px] flex-col p-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#14261c]">Spending trend</h2>
          <p className="mt-0.5 text-[11px] text-[#5c6e63]">Daily expenses this month</p>
        </div>
        <div className="flex items-center gap-4 pt-1 text-[11px] text-[#5c6e63]">
          <span className="flex items-center gap-1.5"><i className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: "#f97316" }} />Daily spend</span>
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={248}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#6b7a8c" tick={{ fontSize: 11, fill: "#5c6e63" }} tickLine={false} axisLine={false} />
              <YAxis width={52} stroke="#6b7a8c" tick={{ fontSize: 11, fill: "#5c6e63" }} tickLine={false} axisLine={false} tickFormatter={v => `Nu.${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#f97316", strokeOpacity: 0.2, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2.5} fill="url(#gradMint)" activeDot={{ r: 5, fill: "#f97316", stroke: "#14261c", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-[248px] place-items-center rounded-xl border border-dashed border-[#e2e8e4] text-[#5c6e63]">
            <div className="text-center">
              <i className="bi bi-graph-up-arrow text-3xl" aria-hidden="true" />
              <p className="mt-2 text-[12px]">No spending data this month</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryDonut({ data, total, onViewAll }: { data: PieSlice[]; total: number; onViewAll: () => void }) {
  return (
    <div className="panel flex h-[368px] flex-col p-6 pb-4">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.4px] text-[#14261c]">By category</h2>
        <p className="mt-0.5 text-[11px] text-[#5c6e63]">Where the money went</p>
      </div>
      {data.length > 0 ? (
        <div className="mt-2 flex min-h-0 flex-1 items-center gap-5">
          <div className="relative grid w-[46%] shrink-0 place-items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none" animationBegin={0} animationDuration={900}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={CAT_COLORS[entry.name as Category]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <span className="block text-[9px] font-bold tracking-[1px] text-[#8a9bb2]">TOTAL</span>
                <strong className="num mt-1 block text-[17px] font-semibold tracking-[-0.7px] text-[#14261c]">{formatAmount(total)}</strong>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {data.map(item => (
              <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex min-w-0 items-center gap-2 text-[#14261c]">
                  <i className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: CAT_COLORS[item.name as Category] }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="num shrink-0 font-bold text-[#14261c]">{formatAmount(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid flex-1 place-items-center text-[12px] text-[#5c6e63]">No data</div>
      )}
      <button onClick={onViewAll} className="mt-auto self-start pt-2 text-[11px] font-bold text-[#c2410c] transition-colors hover:text-[#f97316]">
        View all transactions <i className="bi bi-arrow-right ml-1" aria-hidden="true" />
      </button>
    </div>
  );
}
