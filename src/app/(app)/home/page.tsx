import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getWatchlistsWithItems } from "@/lib/db/watchlists";
import { getQuotes } from "@/lib/market/yahoo";
import { QuoteData } from "@/lib/market/types";
import { getEarningsCalendar } from "@/lib/market/earnings";
import WatchlistWidget from "../WatchlistWidget";
import UpcomingCatalysts from "../UpcomingCatalysts";
import HomeBriefingCard from "@/components/briefing/HomeBriefingCard";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { getLatestBriefings } from "@/lib/db/briefings";
import type { DailyBriefing } from "@/lib/briefing/types";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getUser();

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

  // Quotes (watchlist symbols) and the earnings calendar both depend only on
  // the symbol list, not on each other — fetch them concurrently.
  const [allQuotes, earnings, briefing] = await Promise.all([
    allSymbols.length > 0 ? getQuotes(allSymbols).catch(() => []) : Promise.resolve([]),
    getEarningsCalendar(earningsSymbols).catch(() => []),
    user && hasPortfolioAccess(user.email)
      ? getLatestBriefings(1).then((b): DailyBriefing | null => b[0] ?? null).catch(() => null)
      : Promise.resolve<DailyBriefing | null>(null),
  ]);

  if (allQuotes.length > 0) {
    const quoteMap = new Map(allQuotes.map((q) => [q.symbol, q]));
    for (const wl of watchlists) {
      wl.quotes = wl.symbols.map((s) => quoteMap.get(s)).filter(Boolean) as QuoteData[];
    }
  }

  upcomingEarnings = earnings
    .filter((e) => e.category === "this_week" || e.category === "next_week")
    .slice(0, 20);

  const watchlistWidgetData = watchlists.map((wl) => ({
    id: wl.id,
    name: wl.name,
    tickers: wl.quotes.map((q) => ({
      symbol: q.symbol,
      price: q.price,
      changePct: q.changePct,
    })),
  }));

  // Monochrome surfaces; the only color is the icon glyph itself, so the row
  // reads as one system instead of three tinted slabs.
  const FEATURE_CARDS = [
    {
      href: "/bloodbath",
      title: "Bloodbath",
      color: "text-rose-500 dark:text-loss",
      icon: "M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181",
    },
    {
      href: "/portfolio",
      title: "Portfolio",
      color: "text-emerald-600 dark:text-gain",
      icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
    },
    {
      href: "/time-machine",
      title: "Hindsight",
      color: "text-amber-500 dark:text-amber-400",
      icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    },
  ];

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      {briefing && <HomeBriefingCard briefing={briefing} />}

      <div className="hood-stagger grid grid-cols-3 gap-2">
        {FEATURE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="hood-press hood-card flex flex-col items-center gap-2 rounded-xl border border-stone-100 dark:border-border-subtle bg-white dark:bg-surface-elevated px-3 py-3.5 transition-colors hover:border-stone-200 dark:hover:border-border-default"
          >
            <span className="w-9 h-9 rounded-full bg-stone-50 dark:bg-surface-muted flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className={`w-[18px] h-[18px] ${card.color}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
              </svg>
            </span>
            <span className="text-xs font-bold text-stone-900 dark:text-text">{card.title}</span>
          </Link>
        ))}
      </div>

      <UpcomingCatalysts earnings={upcomingEarnings} />

      {watchlistWidgetData.length > 0 ? (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-stone-900 dark:text-text">
              Watchlists
            </h2>
            <Link
              href="/watchlists"
              className="text-xs font-semibold text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
            >
              Manage
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
            className="hood-pill hood-pill-active px-4 py-2 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
          >
            Create Watchlist
          </Link>
        </div>
      )}
    </div>
  );
}
