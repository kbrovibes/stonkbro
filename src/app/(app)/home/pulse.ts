import "server-only";

import { detectExplosiveMovers } from "@/lib/analysis/movers";
import type { EarningsEvent } from "@/lib/market/earnings";
import { easternDateLabel, getMarketStatus } from "@/lib/market/market-status";
import { deriveMoverReason } from "@/lib/market/mover-reason";
import { getSparkBars, toSparkPoints } from "@/lib/market/spark-series";
import type { QuoteData } from "@/lib/market/types";
import { tagsFromBook, type HoldingBook, type HoldingTags } from "@/lib/portfolio-tags";
import type { DailyBriefing } from "@/lib/briefing/types";
import type {
  PulseBriefing,
  PulseFeature,
  PulseMover,
  PulseScreenProps,
  PulseTicker,
  PulseTile,
  PulseWatchlist,
} from "./pulse-types";

/**
 * Assembles the Pulse screen's props from data the home route already has.
 *
 * The one network call it makes on its own is daily bars for the sparklines,
 * which is cached for fifteen minutes and degrades to a row without a chart
 * rather than a failed render.
 */

/* -- indices ------------------------------------------------------------ */

/**
 * The index hero and the three tiles, in one quote batch.
 *
 * The S&P index itself and the VIX are listed with their symbology
 * alternatives because Tradier's index symbols vary by account type; the
 * first candidate that comes back with a level in a plausible band wins.
 * The last candidate in each list is a tradeable ETF, so every slot resolves
 * to something real even when the index feed is unavailable.
 */
const HERO_CANDIDATES = [
  { symbol: "$SPX.X", name: "S&P 500", min: 1000, max: 20000 },
  { symbol: "SPX", name: "S&P 500", min: 1000, max: 20000 },
  { symbol: "SPY", name: "SPY", min: 1, max: Infinity },
] as const;

const VIX_CANDIDATES = [
  { symbol: "VIX", min: 5, max: 90 },
  { symbol: "$VIX.X", min: 5, max: 90 },
  { symbol: "DIA", min: 1, max: Infinity },
] as const;

export const PULSE_INDEX_SYMBOLS: string[] = [
  ...new Set([
    ...HERO_CANDIDATES.map((c) => c.symbol),
    "QQQ",
    "IWM",
    ...VIX_CANDIDATES.map((c) => c.symbol),
  ]),
];

function pick<T extends { symbol: string; min: number; max: number }>(
  candidates: readonly T[],
  bySymbol: Map<string, QuoteData>,
): { candidate: T; quote: QuoteData } | null {
  for (const candidate of candidates) {
    const quote = bySymbol.get(candidate.symbol);
    if (quote && quote.price >= candidate.min && quote.price <= candidate.max) {
      return { candidate, quote };
    }
  }
  return null;
}

/* -- movers ------------------------------------------------------------- */

/**
 * The same threshold `detectExplosiveMovers` applies before it takes its top
 * ten — repeated here only to count what did not make the cut, which is what
 * the `ALL n` link is offering.
 */
function isMoverCandidate(q: QuoteData): boolean {
  return Math.abs(q.changePct) > 5 || q.volumeRatio > 2.5;
}

/* -- features ----------------------------------------------------------- */

const ICONS = {
  bloodbath:
    "M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181",
  portfolio:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  hindsight: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  paper:
    "M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
  briefing:
    "M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z",
} as const;

export type PulseAccess = {
  signedIn: boolean;
  /** `hasPortfolioAccess(user.email)` — gates Portfolio, Hindsight, Briefing. */
  portfolio: boolean;
};

function featuresFor(access: PulseAccess): PulseFeature[] {
  const all: (PulseFeature & { portfolio?: boolean })[] = [
    { href: "/bloodbath", label: "Bloodbath", icon: ICONS.bloodbath },
    { href: "/portfolio", label: "Portfolio", icon: ICONS.portfolio, portfolio: true },
    { href: "/time-machine", label: "Hindsight", icon: ICONS.hindsight, portfolio: true },
    { href: "/paper", label: "Paper", icon: ICONS.paper },
    { href: "/briefing", label: "Briefing", icon: ICONS.briefing, portfolio: true },
  ];
  return all
    .filter((f) => !f.portfolio || access.portfolio)
    .map(({ href, label, icon }) => ({ href, label, icon }));
}

/* -- briefing ----------------------------------------------------------- */

/** The card's subset of the row — the client never sees the transcript. */
function toPulseBriefing(b: DailyBriefing | null): PulseBriefing | null {
  if (!b) return null;
  if (b.status !== "completed" && b.status !== "running") return null;
  return {
    id: b.id,
    title: b.title,
    summary: b.summary,
    minutes: b.audio_duration_s ? Math.max(1, Math.round(b.audio_duration_s / 60)) : null,
    mood: b.mood ?? "quiet",
    art_seed: b.art_seed ?? 7,
    status: b.status,
  };
}

/* -- tickers ------------------------------------------------------------ */

const FALLBACK_COUNT = 8;

function toTicker(q: QuoteData, tags: HoldingTags): PulseTicker {
  return {
    symbol: q.symbol,
    price: q.price,
    changePct: q.changePct,
    held: tags.held.has(q.symbol),
    atRisk: tags.atRisk.has(q.symbol),
  };
}

export type BuildPulseInput = {
  /** Quotes for the scan universe, already fetched by the route. */
  universeQuotes: QuoteData[];
  /** Quotes for `PULSE_INDEX_SYMBOLS`. */
  indexQuotes: QuoteData[];
  earnings: EarningsEvent[];
  /** Empty for guests — the caller is what gates this on a session. */
  book: HoldingBook;
  /** The user's lists with their quotes already attached; empty for guests. */
  watchlists: { id: string; name: string; quotes: QuoteData[] }[];
  /** Already gated on portfolio access by the route. */
  briefing: DailyBriefing | null;
  access: PulseAccess;
  now?: Date;
};

export async function buildPulse({
  universeQuotes,
  indexQuotes,
  earnings,
  book,
  watchlists,
  briefing,
  access,
  now = new Date(),
}: BuildPulseInput): Promise<PulseScreenProps> {
  const today = easternIsoDate(now);
  const byIndexSymbol = new Map(indexQuotes.map((q) => [q.symbol, q]));

  /* Hero + tiles ------------------------------------------------------- */
  const heroPick = pick(HERO_CANDIDATES, byIndexSymbol);
  const hero = heroPick
    ? {
        name: heroPick.candidate.name,
        level: heroPick.quote.price,
        changePct: heroPick.quote.changePct,
      }
    : null;

  const vixPick = pick(VIX_CANDIDATES, byIndexSymbol);
  const tileQuotes = [byIndexSymbol.get("QQQ"), byIndexSymbol.get("IWM"), vixPick?.quote].filter(
    (q): q is QuoteData => Boolean(q),
  );

  /* Breadth: today's advancing/declining across the scanned universe ---- */
  const breadth = {
    advancing: universeQuotes.filter((q) => q.changePct > 0).length,
    declining: universeQuotes.filter((q) => q.changePct < 0).length,
  };

  /* Movers -------------------------------------------------------------- */
  const detected = detectExplosiveMovers(universeQuotes);
  const quoteBySymbol = new Map(universeQuotes.map((q) => [q.symbol, q]));
  const earningsBySymbol = new Map(earnings.map((e) => [e.symbol, e]));
  const tags = tagsFromBook(book, (symbol) => quoteBySymbol.get(symbol)?.price, today);

  const barSymbols = [...tileQuotes.map((q) => q.symbol), ...detected.map((m) => m.symbol)];
  const bars = await loadBars(barSymbols);

  const tiles: PulseTile[] = tileQuotes.map((q) => ({
    symbol: q.symbol,
    changePct: q.changePct,
    points: toSparkPoints(bars.get(q.symbol) ?? [], q.price, today),
  }));

  const movers: PulseMover[] = detected.map((m) => {
    const quote = quoteBySymbol.get(m.symbol);
    const symbolBars = bars.get(m.symbol) ?? [];
    const reason = quote
      ? deriveMoverReason({
          quote,
          bars: symbolBars,
          daysUntilEarnings: earningsBySymbol.get(m.symbol)?.daysUntil ?? null,
          today,
        })
      : { badge: null, caption: null };

    return {
      symbol: m.symbol,
      price: m.price,
      changePct: m.changePct,
      badge: reason.badge,
      caption: reason.caption,
      points: toSparkPoints(symbolBars, m.price, today),
      held: tags.held.has(m.symbol),
      atRisk: tags.atRisk.has(m.symbol),
    };
  });

  // Signed out the book is empty, so this is a no-op and the list keeps the
  // scanner's own ranking — the same screen, without the personalisation.
  const sorted = [...movers].sort((a, b) => Number(b.atRisk) - Number(a.atRisk));

  /* Watchlists, or the day's extremes when there are none ---------------- */
  const lists: PulseWatchlist[] = watchlists
    .filter((wl) => wl.quotes.length > 0)
    .map((wl) => ({ id: wl.id, name: wl.name, tickers: wl.quotes.map((q) => toTicker(q, tags)) }));

  let winners: PulseTicker[] = [];
  let losers: PulseTicker[] = [];
  if (lists.length === 0) {
    const ranked = universeQuotes
      .filter((q) => Number.isFinite(q.changePct))
      .sort((a, b) => b.changePct - a.changePct);
    winners = ranked.slice(0, FALLBACK_COUNT).filter((q) => q.changePct > 0).map((q) => toTicker(q, tags));
    losers = ranked.slice(-FALLBACK_COUNT).reverse().filter((q) => q.changePct < 0).map((q) => toTicker(q, tags));
  }

  return {
    dateLabel: easternDateLabel(now),
    status: getMarketStatus(now),
    hero,
    breadth,
    tiles,
    movers: sorted,
    moverTotal: universeQuotes.filter(isMoverCandidate).length,
    briefing: access.portfolio ? toPulseBriefing(briefing) : null,
    features: featuresFor(access),
    watchlists: access.signedIn ? lists : [],
    winners,
    losers,
  };
}

/* -- helpers ------------------------------------------------------------ */

async function loadBars(symbols: readonly string[]) {
  const unique = [...new Set(symbols)];
  const settled = await Promise.allSettled(unique.map((s) => getSparkBars(s)));
  const bars = new Map<string, Awaited<ReturnType<typeof getSparkBars>>>();
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") bars.set(unique[i], result.value);
  });
  return bars;
}

/** `YYYY-MM-DD` as it reads in New York, to match Tradier's bar dates. */
function easternIsoDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
