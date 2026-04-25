import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getAllWatchlistSymbols } from "@/lib/db/watchlists";
import { getQuotes } from "@/lib/market/yahoo";

const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "TSLA", "AMD", "PLTR", "META", "AMZN", "GOOGL", "NFLX"];

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tickers = DEFAULT_TICKERS;
  if (user) {
    try {
      const watchlistSymbols = await getAllWatchlistSymbols(user.id);
      if (watchlistSymbols.length > 0) {
        tickers = watchlistSymbols;
      }
    } catch {
      // Fall back to defaults
    }
  }

  const quotes = await getQuotes(tickers);

  // Sort by volume ratio + momentum as a simple score
  const sorted = quotes
    .map((q) => ({
      ...q,
      score: Math.round(
        Math.min(100, Math.max(0,
          (q.volumeRatio > 1 ? q.volumeRatio * 15 : 5) +
          (q.changePct > 0 ? Math.min(q.changePct * 5, 25) : 0) +
          (q.above50sma ? 15 : 0) +
          (q.above200sma ? 10 : 0) +
          (q.price > q.fiftyTwoWeekLow * 1.2 ? 10 : 0)
        ))
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Tip banner */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          Tip: Add your tickers to a watchlist, then run Research to get
          AI-powered trade suggestions.
        </p>
      </div>

      {/* Manage watchlists */}
      <div className="mb-4">
        <Link
          href="/watchlists"
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Manage Watchlists
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Discovery</h2>
        <span className="text-xs font-medium text-stone-400">
          {sorted.length} tickers · live
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-stone-500">No data available. Add tickers to your watchlist.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/ticker/${stock.symbol}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${
                stock.score >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                stock.score >= 45 ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-stone-100 text-stone-500 border-stone-200"
              }`}>
                {stock.score}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900">{stock.symbol}</span>
                  <span className="text-xs text-stone-400 truncate">{stock.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-stone-700">
                    ${stock.price.toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium ${stock.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                  </span>
                  {stock.volumeRatio >= 2 && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      {stock.volumeRatio.toFixed(1)}x vol
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5">
                {stock.above50sma && (
                  <span className="text-[10px] text-emerald-600 font-medium">▲ 50 SMA</span>
                )}
                {stock.above200sma && (
                  <span className="text-[10px] text-emerald-600 font-medium">▲ 200 SMA</span>
                )}
              </div>

              <svg className="w-4 h-4 text-stone-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
