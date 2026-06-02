import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getWatchlistsWithItems } from "@/lib/db/watchlists";
import { getQuotes } from "@/lib/market/yahoo";
import { QuoteData } from "@/lib/market/types";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { getUpcomingIPOs } from "@/lib/market/ipos";
import WatchlistWidget from "../WatchlistWidget";
import UpcomingCatalysts from "../UpcomingCatalysts";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  interface WatchlistData {
    id: string;
    name: string;
    symbols: string[];
    quotes: QuoteData[];
  }
  const watchlists: WatchlistData[] = [];
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
      // Fall back
    }
  }

  const EARNINGS_UNIVERSE = [
    "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX",
    "AMD", "AVGO", "PLTR", "CRWD", "COIN", "SHOP", "SNOW", "DDOG",
    "JPM", "GS", "COST", "DIS", "BA", "UBER", "SOFI", "RKLB",
    "NET", "SQ", "HOOD", "AFRM", "ABNB", "ARM", "SMCI", "MU",
    "LLY", "UNH", "BKNG", "WMT", "CAT", "GE", "MSTR", "RDDT",
  ];
  const earningsSymbols = [...new Set([...allSymbols, ...EARNINGS_UNIVERSE])];
  let upcomingEarnings: { symbol: string; earningsDate: string; daysUntil: number; timing: string; category: string }[] = [];
  try {
    const earnings = await getEarningsCalendar(earningsSymbols);
    upcomingEarnings = earnings
      .filter((e) => e.category === "this_week" || e.category === "next_week")
      .slice(0, 20);
  } catch {
    // ignore
  }

  const upcomingIPOs = await getUpcomingIPOs();

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
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <UpcomingCatalysts earnings={upcomingEarnings} ipos={upcomingIPOs} />

      {watchlistWidgetData.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800 dark:text-text">Watchlists</h2>
            <Link
              href="/watchlists"
              className="text-[11px] font-semibold text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
            >
              Manage Watchlists
            </Link>
          </div>
          <WatchlistWidget watchlists={watchlistWidgetData} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-1">No watchlists yet</h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle mb-4">Create a watchlist to see your tickers here.</p>
          <Link
            href="/watchlists"
            className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
          >
            Create Watchlist
          </Link>
        </div>
      )}
    </div>
  );
}
