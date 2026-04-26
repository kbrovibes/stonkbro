import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getWatchlistsWithItems } from "@/lib/db/watchlists";
import { getQuotes } from "@/lib/market/yahoo";
import { QuoteData } from "@/lib/market/types";
import DiscoveryTable from "./DiscoveryTable";
import WatchlistWidget from "./WatchlistWidget";

const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "TSLA", "AMD", "PLTR", "META", "AMZN", "GOOGL", "NFLX"];

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch watchlists with items if logged in
  interface WatchlistData {
    id: string;
    name: string;
    symbols: string[];
    quotes: QuoteData[];
  }
  let watchlists: WatchlistData[] = [];
  let allSymbols: string[] = [];

  if (user) {
    try {
      const wls = await getWatchlistsWithItems(user.id);
      const symbolSet = new Set<string>();
      for (const wl of wls) {
        const symbols = (wl.watchlist_items || []).map((i: { symbol: string }) => i.symbol);
        symbols.forEach((s: string) => symbolSet.add(s));
        watchlists.push({ id: wl.id, name: wl.name, symbols, quotes: [] });
      }
      allSymbols = [...symbolSet];

      if (allSymbols.length > 0) {
        const allQuotes = await getQuotes(allSymbols);
        const quoteMap = new Map(allQuotes.map((q) => [q.symbol, q]));
        for (const wl of watchlists) {
          wl.quotes = wl.symbols.map((s) => quoteMap.get(s)).filter(Boolean) as QuoteData[];
        }
      }
    } catch {
      // Fall back to defaults
    }
  }

  const tickers = allSymbols.length > 0 ? allSymbols : DEFAULT_TICKERS;
  const quotes = allSymbols.length > 0
    ? watchlists.flatMap((wl) => wl.quotes)
    : await getQuotes(tickers);

  // Dedupe quotes by symbol
  const seenSymbols = new Set<string>();
  const uniqueQuotes = quotes.filter((q) => {
    if (seenSymbols.has(q.symbol)) return false;
    seenSymbols.add(q.symbol);
    return true;
  });

  const sorted = uniqueQuotes
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

  // Serialize watchlist data for the client widget
  const watchlistWidgetData = watchlists.map((wl) => ({
    id: wl.id,
    name: wl.name,
    tickers: wl.quotes.map((q) => ({
      symbol: q.symbol,
      price: q.price,
      changePct: q.changePct,
    })),
  }));

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Watchlist badges */}
      {watchlistWidgetData.length > 0 && (
        <div className="mb-4">
          <WatchlistWidget watchlists={watchlistWidgetData} />
        </div>
      )}

      <div className="mb-4">
        <Link
          href="/watchlists"
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Manage Watchlists
        </Link>
      </div>

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
