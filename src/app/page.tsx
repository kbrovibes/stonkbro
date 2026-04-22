import Link from "next/link";
import { mockStocks } from "@/lib/mock/stocks";
import Sparkline from "@/components/Sparkline";
import ScoreBadge from "@/components/ScoreBadge";

export default function DiscoverPage() {
  const sorted = [...mockStocks].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Discovery</h2>
        <span className="text-xs font-medium text-stone-400">
          {sorted.length} tickers
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((stock) => (
          <Link
            key={stock.symbol}
            href={`/ticker/${stock.symbol}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
          >
            <ScoreBadge score={stock.score} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">{stock.symbol}</span>
                <span className="text-xs text-stone-400 truncate">{stock.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-stone-700">
                  ${stock.price.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    stock.changePct >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                </span>
                {stock.volumeRatio >= 2 && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    {stock.volumeRatio.toFixed(1)}x vol
                  </span>
                )}
              </div>
            </div>

            <div className="w-16 h-8 shrink-0">
              <Sparkline
                data={stock.sparkline}
                color={stock.changePct >= 0 ? "#059669" : "#ef4444"}
              />
            </div>

            <svg className="w-4 h-4 text-stone-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
