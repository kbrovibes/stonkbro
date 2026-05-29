import { getQuote } from "@/lib/market/yahoo";
import { getHistory, type DailyBar } from "@/lib/market/history";
import { getRecentHeadlines } from "@/lib/market/yahoo-news";
import type { TickerEnrichment } from "./types";

function pctChange(from: number, to: number): number {
  if (!from || !Number.isFinite(from)) return 0;
  return ((to - from) / from) * 100;
}

function rsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  const period = 14;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += -diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function macd(closes: number[]): { macd: number; signal: number } | null {
  if (closes.length < 35) return null;
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = ema(macdLine.slice(-20), 9);
  return {
    macd: Math.round(macdLine[macdLine.length - 1] * 100) / 100,
    signal: Math.round(signalLine[signalLine.length - 1] * 100) / 100,
  };
}

function pickClose(bars: DailyBar[] | null, daysAgo: number): number | null {
  if (!bars || bars.length === 0) return null;
  // bars are oldest → newest; pick the bar `daysAgo` trading days back
  const idx = bars.length - 1 - daysAgo;
  if (idx < 0) return bars[0].close;
  return bars[idx]?.close ?? null;
}

export async function enrichTicker(symbol: string): Promise<TickerEnrichment | null> {
  try {
    const [quote, history, headlines] = await Promise.all([
      getQuote(symbol),
      getHistory(symbol, 200).catch(() => null),
      getRecentHeadlines(symbol, 5),
    ]);

    if (!quote) return null;

    const bars = history && history.length > 0 ? history : null;
    const closes = bars?.map((b) => b.close) ?? [];

    const change1d = quote.changePct;
    const closeFive = pickClose(bars, 5);
    const close30 = pickClose(bars, 21);
    const close90 = pickClose(bars, 63);
    const close5d = closeFive ? pctChange(closeFive, quote.price) : 0;
    const change30 = close30 ? pctChange(close30, quote.price) : 0;
    const change90 = close90 ? pctChange(close90, quote.price) : 0;

    const rsi = rsi14(closes);
    const macdRes = macd(closes);

    const dist52High = quote.fiftyTwoWeekHigh > 0
      ? ((quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh) * 100
      : 0;
    const dist52Low = quote.fiftyTwoWeekLow > 0
      ? ((quote.price - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow) * 100
      : 0;

    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change_1d_pct: round(change1d),
      change_5d_pct: round(close5d),
      change_30d_pct: round(change30),
      change_90d_pct: round(change90),
      rsi_14: rsi,
      macd: macdRes?.macd ?? null,
      macd_signal: macdRes?.signal ?? null,
      sma_50: quote.fiftyDayAvg || null,
      sma_200: quote.twoHundredDayAvg || null,
      above_50sma: quote.above50sma,
      above_200sma: quote.above200sma,
      volume_ratio: round(quote.volumeRatio),
      distance_from_52w_high_pct: round(dist52High),
      distance_from_52w_low_pct: round(dist52Low),
      earnings_date: quote.earningsDate,
      news_headlines: headlines,
    };
  } catch (e) {
    console.error(`[enrich] ${symbol} failed:`, e);
    return null;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Enrich a list of symbols in parallel with concurrency limit. */
export async function enrichAll(symbols: string[], concurrency = 5): Promise<TickerEnrichment[]> {
  const results: TickerEnrichment[] = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const enriched = await Promise.all(batch.map((s) => enrichTicker(s)));
    for (const e of enriched) if (e) results.push(e);
  }
  return results;
}
