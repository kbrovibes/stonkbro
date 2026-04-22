import Link from "next/link";
import { mockPositions } from "@/lib/mock/stocks";

function formatCurrency(n: number) {
  const prefix = n >= 0 ? "+$" : "-$";
  return prefix + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-stone-100 text-stone-600" },
    profit_target: { label: "Profit Target", color: "bg-emerald-50 text-emerald-700" },
    needs_roll: { label: "Needs Roll", color: "bg-amber-50 text-amber-700" },
    warning: { label: "Warning", color: "bg-red-50 text-red-600" },
  };
  const { label, color } = config[status] || config.active;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}

export default function PortfolioPage() {
  const totalPnl = mockPositions.reduce((sum, p) => sum + p.totalPnl, 0);
  const totalIncome = mockPositions.reduce((sum, p) => sum + p.incomeCollected, 0);

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Summary */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-stone-900">Portfolio</h2>
        <span className="text-xs text-stone-400">{mockPositions.length} positions</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Total P&L</p>
          <p className={`text-xl font-bold mt-1 ${totalPnl >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Income Collected</p>
          <p className="text-xl font-bold mt-1 text-stone-900">
            ${totalIncome.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Strategy links */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/covered-calls" className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900">Covered Calls</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Optimize strikes</p>
        </Link>
        <Link href="/wheel" className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900">The Wheel</p>
          <p className="text-[10px] text-stone-400 mt-0.5">View cycles</p>
        </Link>
      </div>

      {/* Positions */}
      <div className="flex flex-col gap-3">
        {mockPositions.map((pos, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">{pos.symbol}</span>
                <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                  {pos.strategy}
                </span>
              </div>
              <StatusBadge status={pos.status} />
            </div>

            {/* Legs */}
            <div className="flex flex-col gap-1.5 mb-3">
              {pos.legs.map((leg, j) => (
                <div key={j} className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 truncate mr-2">{leg.description}</span>
                  <span className={`font-semibold shrink-0 ${leg.pnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {leg.pnl >= 0 ? "+" : ""}{leg.pnl}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-stone-400">P&L</p>
                  <p className={`text-sm font-bold ${pos.totalPnl >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatCurrency(pos.totalPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-400">Income</p>
                  <p className="text-sm font-bold text-stone-900">${pos.incomeCollected.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-stone-400">{pos.daysOpen}d open</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
