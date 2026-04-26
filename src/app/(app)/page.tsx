import { createClient } from "@/lib/supabase-server";
import { getAllWatchlistSymbols } from "@/lib/db/watchlists";
import { getQuotes } from "@/lib/market/yahoo";
import DiscoveryTable from "./DiscoveryTable";

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

  const sorted = quotes
    .map((q) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      changePct: q.changePct,
      volumeRatio: q.volumeRatio,
      above50sma: q.above50sma,
      above200sma: q.above200sma,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-stone-900">Discovery</h2>
        <span className="text-xs font-medium text-stone-400">
          {sorted.length} tickers
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-stone-500">No data available. Add tickers to your watchlist.</p>
        </div>
      ) : (
        <DiscoveryTable stocks={sorted} />
      )}
    </div>
  );
}
