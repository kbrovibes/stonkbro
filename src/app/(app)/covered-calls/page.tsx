import Link from "next/link";
import { mockCoveredCalls } from "@/lib/mock/covered-calls";

function formatDollar(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

export default function CoveredCallsPage() {
  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <Link href="/" className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </Link>

      <div>
        <h2 className="text-lg font-extrabold text-stone-900">Covered Call Optimizer</h2>
        <p className="text-xs text-stone-500 mt-0.5">Compare strikes and expirations for your holdings</p>
      </div>

      {mockCoveredCalls.map((analysis) => (
        <div key={analysis.symbol} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-900">{analysis.symbol}</span>
              <span className="text-xs text-stone-400">
                {analysis.sharesOwned} shares @ {formatDollar(analysis.costBasis)}
              </span>
            </div>
            <span className="text-sm font-semibold text-stone-700">
              {formatDollar(analysis.currentPrice)}
            </span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              <span>Strike</span>
              <span>Premium</span>
              <span>Prob OTM</span>
              <span>Ann. Ret.</span>
              <span>Max Profit</span>
            </div>

            {analysis.options.map((opt, i) => {
              const prevExpiry = i > 0 ? analysis.options[i - 1].expiry : null;
              const showDivider = prevExpiry && prevExpiry !== opt.expiry;

              return (
                <div key={i}>
                  {showDivider && <div className="border-t-2 border-stone-200" />}
                  <div className="grid grid-cols-5 gap-1 px-3 py-2.5 border-b border-stone-50 hover:bg-stone-50/50 transition-colors items-center">
                    <div>
                      <span className="text-xs font-bold text-stone-900">${opt.strike}</span>
                      <span className="text-[10px] text-stone-400 block">{opt.expiry} · {opt.dte}d</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">${opt.premium.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${opt.probOTM >= 75 ? "bg-emerald-500" : opt.probOTM >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                          style={{ width: `${opt.probOTM}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-500">{opt.probOTM}%</span>
                    </div>
                    <span className={`text-xs font-semibold ${opt.annualizedReturn >= 20 ? "text-emerald-700" : opt.annualizedReturn >= 10 ? "text-amber-600" : "text-stone-500"}`}>
                      {opt.annualizedReturn.toFixed(1)}%
                    </span>
                    <span className="text-xs text-stone-700">{formatDollar(opt.maxProfit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
