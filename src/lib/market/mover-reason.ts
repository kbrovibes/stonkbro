/**
 * Why a mover moved, derived from data we already have.
 *
 * The Pulse list is built on the premise that a percentage alone makes you
 * tap the row to find out what happened. So every row carries a badge and a
 * caption naming the cause. The hard constraint is that nothing here may be
 * guessed: each branch below is a test against a number from the quote, the
 * daily bars, or the earnings calendar. When no test fires the row gets no
 * badge — an unlabelled row is honest, a plausible-sounding label is not.
 *
 * Deliberately absent: anything news-shaped ("contract award", "analyst
 * upgrade", "FDA approval"). We have no news feed, and those are exactly the
 * captions that would read best and be invented.
 */

import type { DailyBar } from "@/lib/market/history";
import { getSectorForTicker } from "@/lib/market/sectors";
import type { QuoteData } from "@/lib/market/types";

export type MoverBadgeLabel = "EARNINGS" | "BREAKOUT" | "REVERSAL";

export type MoverReason = {
  /** Informational (amber) badge, or null when nothing is derivable. */
  badge: MoverBadgeLabel | null;
  /** `<cause> · <sector or volume multiple>`. Null when neither is known. */
  caption: string | null;
};

export type MoverReasonInput = {
  quote: QuoteData;
  /** Daily bars, oldest first. 52+ enables the 50-day cross test. */
  bars?: readonly DailyBar[];
  /** Days until this symbol's next report, from the earnings calendar. */
  daysUntilEarnings?: number | null;
  /** `YYYY-MM-DD` in the market's timezone, for the gap test. */
  today?: string;
};

/** Within half a percent of the 52-week extreme counts as at it. */
const EXTREME_TOLERANCE = 0.005;
/** The move already had to clear the mover filter; this is the gap on top. */
const GAP_THRESHOLD = 0.02;
/** Matches `detectExplosiveMovers`' own "heavy volume" line. */
const VOLUME_SURGE = 2.5;

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Did today's close cross the 50-day average that yesterday's close sat on
 * the other side of?
 *
 * Both averages are computed over their own trailing 50 bars, so the
 * comparison is a genuine cross rather than one average read twice.
 */
function fiftyDayCross(bars: readonly DailyBar[]): "up" | "down" | null {
  const closes = bars.map((b) => b.close).filter((c) => c > 0);
  if (closes.length < 52) return null;

  const today = closes[closes.length - 1];
  const yesterday = closes[closes.length - 2];
  const smaToday = mean(closes.slice(-50));
  const smaYesterday = mean(closes.slice(-51, -1));
  if (smaToday <= 0 || smaYesterday <= 0) return null;

  const above = today > smaToday;
  const wasAbove = yesterday > smaYesterday;
  if (above === wasAbove) return null;
  return above ? "up" : "down";
}

/** Today's open against yesterday's close, when today's bar has printed. */
function overnightGap(bars: readonly DailyBar[], today: string | undefined): number | null {
  if (bars.length < 2 || !today) return null;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  if (last.date !== today) return null;
  if (!(prev.close > 0) || !(last.open > 0)) return null;
  return (last.open - prev.close) / prev.close;
}

/** The cause clause — the half of the caption that answers "why". */
function causePhrase(input: MoverReasonInput): { badge: MoverBadgeLabel | null; phrase: string | null } {
  const { quote, bars, daysUntilEarnings } = input;
  const up = quote.changePct >= 0;

  if (daysUntilEarnings === 0) return { badge: "EARNINGS", phrase: "Earnings today" };
  if (daysUntilEarnings === 1) return { badge: "EARNINGS", phrase: "Earnings tomorrow" };

  if (up && quote.fiftyTwoWeekHigh > 0 && quote.price >= quote.fiftyTwoWeekHigh * (1 - EXTREME_TOLERANCE)) {
    return { badge: "BREAKOUT", phrase: "52-week high" };
  }

  const cross = bars ? fiftyDayCross(bars) : null;
  if (cross === "up" && up) return { badge: "REVERSAL", phrase: "Reclaimed 50-day" };
  if (cross === "down" && !up) return { badge: "REVERSAL", phrase: "Lost 50-day" };

  // Past here nothing in the badge vocabulary applies, so the row carries a
  // caption without a badge rather than being given the nearest-fitting one.
  if (!up && quote.fiftyTwoWeekLow > 0 && quote.price <= quote.fiftyTwoWeekLow * (1 + EXTREME_TOLERANCE)) {
    return { badge: null, phrase: "52-week low" };
  }

  const gap = bars ? overnightGap(bars, input.today) : null;
  if (gap !== null && Math.abs(gap) >= GAP_THRESHOLD) {
    return { badge: null, phrase: gap > 0 ? "Gap up" : "Gap down" };
  }

  if (quote.volumeRatio >= VOLUME_SURGE) return { badge: null, phrase: "Volume surge" };

  return { badge: null, phrase: null };
}

/** The context clause — sector when we know it, otherwise the volume multiple. */
function contextPhrase(quote: QuoteData): string | null {
  const sector = getSectorForTicker(quote.symbol);
  if (sector) return sector.name;
  if (quote.volumeRatio >= 1.5) return `vol ${quote.volumeRatio.toFixed(1)}×`;
  return null;
}

export function deriveMoverReason(input: MoverReasonInput): MoverReason {
  const { badge, phrase } = causePhrase(input);
  const context = contextPhrase(input.quote);
  const parts = [phrase, context].filter((p): p is string => Boolean(p));
  return { badge, caption: parts.length > 0 ? parts.join(" · ") : null };
}
