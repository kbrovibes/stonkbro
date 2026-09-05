import "server-only";

import { detectExplosiveMovers } from "@/lib/analysis/movers";
import type { EarningsEvent } from "@/lib/market/earnings";
import { easternDateLabel, getMarketStatus } from "@/lib/market/market-status";
import { deriveMoverReason } from "@/lib/market/mover-reason";
import { getSparkBars, toSparkPoints } from "@/lib/market/spark-series";
import type { QuoteData } from "@/lib/market/types";
import { tagsFromBook, type HoldingBook } from "@/lib/portfolio-tags";
import type { PulseMover, PulseScreenProps, PulseTile } from "./PulseScreen";

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

export type BuildPulseInput = {
  /** Quotes for the scan universe, already fetched by the route. */
  universeQuotes: QuoteData[];
  /** Quotes for `PULSE_INDEX_SYMBOLS`. */
  indexQuotes: QuoteData[];
  earnings: EarningsEvent[];
  /** Empty for guests — the caller is what gates this on a session. */
  book: HoldingBook;
  now?: Date;
};

export async function buildPulse({
  universeQuotes,
  indexQuotes,
  earnings,
  book,
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

  return {
    dateLabel: easternDateLabel(now),
    status: getMarketStatus(now),
    hero,
    breadth,
    tiles,
    movers: sorted,
    moverTotal: universeQuotes.filter(isMoverCandidate).length,
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
