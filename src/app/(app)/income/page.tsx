import Link from "next/link";
import { mockIncome, incomeStats } from "@/lib/mock/covered-calls";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-stone-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-stone-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function IncomePage() {
  const maxMonthly = Math.max(...mockIncome.map((m) => m.total));

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div>
        <h2 className="text-lg font-extrabold text-stone-900">Income Dashboard</h2>
        <p className="text-xs text-stone-500 mt-0.5">Options premium + capital gains tracker</p>
      </div>

      {/* Starting capital callout */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-sky-800">Starting Capital</p>
            <p className="text-2xl font-extrabold text-sky-900 mt-0.5">${incomeStats.startingCash.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-sky-800">Current Value</p>
            <p className="text-2xl font-extrabold text-sky-900 mt-0.5">${incomeStats.currentValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-sky-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(incomeStats.totalReturn / incomeStats.startingCash) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-700">
            +{incomeStats.totalReturnPct}%
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="YTD Income" value={`$${incomeStats.ytdIncome.toLocaleString()}`} sub="premium + gains" />
        <StatCard label="Monthly Avg" value={`$${incomeStats.monthlyAvg.toLocaleString()}`} sub="per month" />
        <StatCard label="Ann. Yield" value={`${incomeStats.annualizedYield}%`} sub="on starting capital" />
        <StatCard label="Completed" value={`${incomeStats.completedCycles}`} sub="trade cycles" />
      </div>

      {/* Monthly breakdown */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-900 mb-4">Monthly Breakdown</h3>
        <div className="flex flex-col gap-3">
          {mockIncome.map((month) => (
            <div key={month.month} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-stone-500 w-8">{month.month}</span>
              <div className="flex-1 flex gap-0.5 h-6">
                <div
                  className="bg-emerald-400 rounded-l h-full"
                  style={{ width: `${(month.premiumCollected / maxMonthly) * 100}%` }}
                />
                {month.capitalGains > 0 && (
                  <div
                    className="bg-sky-400 rounded-r h-full"
                    style={{ width: `${(month.capitalGains / maxMonthly) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-xs font-bold text-stone-900 w-14 text-right">
                ${month.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-stone-400">Premium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-[10px] text-stone-400">Capital Gains</span>
          </div>
        </div>
      </div>

      {/* Strategy links */}
      <div className="flex flex-col gap-2">
        <Link
          href="/covered-calls"
          className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-900">Covered Call Optimizer</h3>
            <p className="text-xs text-stone-500 mt-0.5">Compare strikes and expirations</p>
          </div>
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link
          href="/wheel"
          className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-900">The Wheel Visualizer</h3>
            <p className="text-xs text-stone-500 mt-0.5">Track your sell put → sell call cycles</p>
          </div>
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
