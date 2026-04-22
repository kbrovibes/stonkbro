import Link from "next/link";
import { mockWheel } from "@/lib/mock/covered-calls";

const stepIcons: Record<string, { emoji: string; color: string }> = {
  sell_put: { emoji: "P", color: "bg-amber-100 text-amber-700" },
  assigned: { emoji: "A", color: "bg-sky-100 text-sky-700" },
  sell_call: { emoji: "C", color: "bg-emerald-100 text-emerald-700" },
  called_away: { emoji: "X", color: "bg-violet-100 text-violet-700" },
};

export default function WheelPage() {
  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <Link href="/portfolio" className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Portfolio
      </Link>

      <div>
        <h2 className="text-lg font-extrabold text-stone-900">The Wheel</h2>
        <p className="text-xs text-stone-500 mt-0.5">Sell puts → get assigned → sell calls → repeat</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(stepIcons).map(([key, { emoji, color }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-[10px] font-bold`}>{emoji}</span>
            <span className="text-[10px] text-stone-400 capitalize">{key.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {mockWheel.map((pos) => (
        <div key={pos.symbol} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">{pos.symbol}</span>
                <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                  {pos.currentStep}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-700">+${pos.totalIncome}</p>
                <p className="text-[10px] text-stone-400">{pos.annualizedReturn}% ann.</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-4 py-3">
            <div className="flex flex-col gap-0">
              {pos.cycles.map((cycle, i) => {
                const icon = stepIcons[cycle.step];
                const isLast = i === pos.cycles.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full ${icon.color} flex items-center justify-center text-[10px] font-bold shrink-0 ${cycle.status === "active" ? "ring-2 ring-offset-1 ring-sky-300" : ""}`}>
                        {icon.emoji}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-stone-200 min-h-[16px]" />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-3 ${isLast ? "" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-stone-800">{cycle.description}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">{cycle.date}</p>
                        </div>
                        {cycle.premium > 0 && (
                          <span className={`text-xs font-semibold ${cycle.step === "assigned" ? "text-stone-500" : "text-emerald-600"}`}>
                            +${cycle.premium}
                          </span>
                        )}
                      </div>

                      {/* Cumulative bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: `${(cycle.cumulativeIncome / pos.startingCash) * 100 * 5}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-stone-400">${cycle.cumulativeIncome}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-3 border-t border-stone-100">
            <div className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-stone-400">Cycles</p>
              <p className="text-xs font-bold text-stone-900">{pos.totalCycles}</p>
            </div>
            <div className="px-3 py-2.5 text-center border-x border-stone-100">
              <p className="text-[10px] text-stone-400">Avg/Cycle</p>
              <p className="text-xs font-bold text-stone-900">${pos.avgCycleReturn}</p>
            </div>
            <div className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-stone-400">Started</p>
              <p className="text-xs font-bold text-stone-900">{pos.startDate.slice(5)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
