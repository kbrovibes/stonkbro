/**
 * Bloodbath scanner — measure how far tickers have fallen in the current
 * pullback (peak close over the last ~4 weeks → now).
 */

import type { QuoteData } from "@/lib/market/types";
import { getQuotes } from "@/lib/market/yahoo";
import { getHistory } from "@/lib/market/history";
import { SCAN_UNIVERSE } from "./movers";

export type BloodbathTicker = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  drawdownPct: number; // % off the highest close of the last 4 weeks (negative = down)
  peakClose: number;
  peakDate: string;
  fourWeekChangePct: number; // close ~20 trading days ago → now
  belowFiftySMA: boolean;
  volumeRatio: number;
  isWatchlist: boolean;
};

export type BloodbathScan = {
  watchlist: BloodbathTicker[];
  market: BloodbathTicker[];
  scannedCount: number;
};

const LOOKBACK_DAYS = 20; // trading bars (getHistory returns the last N bars) ≈ 4 weeks
const MARKET_DRAWDOWN_CUTOFF = -10; // only show non-watchlist names down at least this much
const MAX_MARKET_ROWS = 15;
const MAX_HISTORY_FETCHES = 60;

async function buildTicker(q: QuoteData, isWatchlist: boolean): Promise<BloodbathTicker | null> {
  const bars = await getHistory(q.symbol, LOOKBACK_DAYS);
  if (bars.length === 0) return null;

  let peakClose = bars[0].close;
  let peakDate = bars[0].date;
  for (const b of bars) {
    if (b.close > peakClose) {
      peakClose = b.close;
      peakDate = b.date;
    }
  }

  const firstClose = bars[0].close;
  const drawdownPct = peakClose > 0 ? ((q.price - peakClose) / peakClose) * 100 : 0;
  const fourWeekChangePct = firstClose > 0 ? ((q.price - firstClose) / firstClose) * 100 : 0;

  return {
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    changePct: Math.round(q.changePct * 100) / 100,
    drawdownPct: Math.round(drawdownPct * 100) / 100,
    peakClose: Math.round(peakClose * 100) / 100,
    peakDate,
    fourWeekChangePct: Math.round(fourWeekChangePct * 100) / 100,
    belowFiftySMA: !q.above50sma,
    volumeRatio: Math.round(q.volumeRatio * 100) / 100,
    isWatchlist,
  };
}

export async function scanBloodbath(watchlistSymbols: string[]): Promise<BloodbathScan> {
  const watchSet = new Set(watchlistSymbols.map((s) => s.toUpperCase()));
  const universe = [...new Set([...watchSet, ...SCAN_UNIVERSE])];

  const quotes = await getQuotes(universe);

  // Watchlist tickers always get full drawdown data. Market tickers are
  // pre-filtered by cheap quote-level pullback signals before the (per-symbol)
  // history fetch: below the 50-day SMA or red on the day.
  const watchQuotes = quotes.filter((q) => watchSet.has(q.symbol));
  const marketCandidates = quotes
    .filter((q) => !watchSet.has(q.symbol) && (!q.above50sma || q.changePct < -3))
    .map((q) => ({
      q,
      pctBelow50: q.fiftyDayAvg > 0 ? (q.price - q.fiftyDayAvg) / q.fiftyDayAvg : 0,
    }))
    .sort((a, b) => a.pctBelow50 - b.pctBelow50)
    .slice(0, Math.max(0, MAX_HISTORY_FETCHES - watchQuotes.length))
    .map((c) => c.q);

  const [watchlistRows, marketRows] = await Promise.all([
    Promise.all(watchQuotes.map((q) => buildTicker(q, true))),
    Promise.all(marketCandidates.map((q) => buildTicker(q, false))),
  ]);

  const watchlist = (watchlistRows.filter(Boolean) as BloodbathTicker[]).sort(
    (a, b) => a.drawdownPct - b.drawdownPct
  );
  const market = (marketRows.filter(Boolean) as BloodbathTicker[])
    .filter((t) => t.drawdownPct <= MARKET_DRAWDOWN_CUTOFF)
    .sort((a, b) => a.drawdownPct - b.drawdownPct)
    .slice(0, MAX_MARKET_ROWS);

  return { watchlist, market, scannedCount: quotes.length };
}
