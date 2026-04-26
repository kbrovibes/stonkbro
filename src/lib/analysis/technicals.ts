import { DailyBar, getHistory } from "@/lib/market/history";
import { QuoteData } from "@/lib/market/types";

export type TechnicalSignals = {
  symbol: string;
  price: number;
  name: string;

  // Trend
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  macdCross: "bullish" | "bearish" | "none";

  // Moving averages
  sma20: number;
  sma50: number;
  sma200: number;
  above20sma: boolean;
  above50sma: boolean;
  above200sma: boolean;
  goldenCross: boolean; // 50 SMA > 200 SMA

  // Volatility
  bbUpper: number;
  bbLower: number;
  bbSqueeze: boolean; // Bollinger Band width < 20-day avg width
  bbPosition: number; // 0-1 where price sits within bands

  // Volume
  volumeRatio: number;
  volumeSpike: boolean; // > 2x avg

  // Price action
  distFrom52High: number; // % below 52w high
  distFrom52Low: number;  // % above 52w low
  change1d: number;
  change5d: number;
  change20d: number;

  // Support / Resistance
  nearestSupport: number;
  nearestResistance: number;

  // Earnings
  earningsDate: string | null;
  daysToEarnings: number | null;

  // Composite
  score: number; // 0-100 composite signal strength
  signals: string[]; // Human-readable signal descriptions
};

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcBollingerBands(closes: number[], period = 20, mult = 2): { upper: number; lower: number; mid: number; width: number } {
  const sma = calcSMA(closes, period);
  const slice = closes.slice(-period);
  const std = Math.sqrt(slice.reduce((sum, v) => sum + (v - sma) ** 2, 0) / period);
  return {
    upper: sma + mult * std,
    lower: sma - mult * std,
    mid: sma,
    width: (mult * std * 2) / sma,
  };
}

function findSupportResistance(bars: DailyBar[], currentPrice: number): { support: number; resistance: number } {
  // Simple pivot-based S/R from recent lows and highs
  const recentBars = bars.slice(-60);
  const lows = recentBars.map((b) => b.low).sort((a, b) => a - b);
  const highs = recentBars.map((b) => b.high).sort((a, b) => b - a);

  // Nearest support = highest low below current price
  const support = lows.filter((l) => l < currentPrice * 0.99).pop() || currentPrice * 0.95;
  // Nearest resistance = lowest high above current price
  const resistance = highs.filter((h) => h > currentPrice * 1.01).pop() || currentPrice * 1.05;

  return { support, resistance };
}

export async function analyzeTechnicals(symbol: string, quote: QuoteData): Promise<TechnicalSignals> {
  const bars = await getHistory(symbol, 200);
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);

  // RSI
  const rsi14 = Math.round(calcRSI(closes) * 10) / 10;

  // MACD (12, 26, 9)
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const macdValues = ema12.map((v, i) => v - ema26[i]);
  const macdSignalLine = calcEMA(macdValues, 9);
  const macdSignal = macdSignalLine[macdSignalLine.length - 1];
  const macdHistogram = macdLine - macdSignal;
  const prevHistogram = macdValues[macdValues.length - 2] - macdSignalLine[macdSignalLine.length - 2];
  const macdCross = prevHistogram < 0 && macdHistogram > 0 ? "bullish" as const
    : prevHistogram > 0 && macdHistogram < 0 ? "bearish" as const
    : "none" as const;

  // SMAs
  const sma20 = Math.round(calcSMA(closes, 20) * 100) / 100;
  const sma50 = Math.round(calcSMA(closes, 50) * 100) / 100;
  const sma200 = closes.length >= 200 ? Math.round(calcSMA(closes, 200) * 100) / 100 : 0;

  // Bollinger Bands
  const bb = calcBollingerBands(closes);
  const bbPrev = calcBollingerBands(closes.slice(0, -20));
  const bbSqueeze = bb.width < bbPrev.width * 0.8;
  const bbPosition = bb.upper !== bb.lower ? (quote.price - bb.lower) / (bb.upper - bb.lower) : 0.5;

  // Volume
  const avgVolume = volumes.length >= 20 ? calcSMA(volumes, 20) : volumes[volumes.length - 1];
  const volumeRatio = avgVolume > 0 ? quote.volume / avgVolume : 1;

  // Price changes
  const change1d = closes.length >= 2 ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
  const change5d = closes.length >= 6 ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100 : 0;
  const change20d = closes.length >= 21 ? ((closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21]) * 100 : 0;

  // S/R
  const { support, resistance } = findSupportResistance(bars, quote.price);

  // 52-week
  const distFrom52High = quote.fiftyTwoWeekHigh > 0 ? ((quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh) * 100 : 0;
  const distFrom52Low = quote.fiftyTwoWeekLow > 0 ? ((quote.price - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow) * 100 : 0;

  // Earnings
  const earningsDate = quote.earningsDate ?? null;
  let daysToEarnings: number | null = null;
  if (earningsDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const earningsDay = new Date(earningsDate);
    earningsDay.setHours(0, 0, 0, 0);
    const diffMs = earningsDay.getTime() - today.getTime();
    daysToEarnings = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (daysToEarnings < 0) daysToEarnings = null; // past earnings, ignore
  }

  // Build signals list
  const signals: string[] = [];
  if (macdCross === "bullish") signals.push("MACD bullish crossover");
  if (macdCross === "bearish") signals.push("MACD bearish crossover");
  if (rsi14 > 70) signals.push(`RSI overbought (${rsi14})`);
  if (rsi14 < 30) signals.push(`RSI oversold (${rsi14})`);
  if (rsi14 >= 50 && rsi14 <= 70) signals.push(`RSI momentum (${rsi14})`);
  if (quote.price > sma50 && quote.price > sma200) signals.push("Above all major MAs");
  if (sma50 > sma200 && closes.length >= 200) signals.push("Golden cross active");
  if (bbSqueeze) signals.push("Bollinger squeeze — breakout pending");
  if (volumeRatio >= 2.5) signals.push(`Volume spike ${volumeRatio.toFixed(1)}x avg`);
  if (volumeRatio >= 1.5 && volumeRatio < 2.5) signals.push(`Elevated volume ${volumeRatio.toFixed(1)}x`);
  if (distFrom52High < 5) signals.push("Near 52-week high");
  if (distFrom52High > 30) signals.push(`${distFrom52High.toFixed(0)}% below 52w high — pullback`);
  if (change5d > 10) signals.push(`+${change5d.toFixed(1)}% in 5 days`);
  if (change5d < -10) signals.push(`${change5d.toFixed(1)}% in 5 days`);
  if (change20d > 20) signals.push(`+${change20d.toFixed(0)}% in 20 days — strong momentum`);
  if (daysToEarnings !== null && daysToEarnings <= 7) signals.push(`Earnings in ${daysToEarnings}d — elevated IV expected`);

  // Composite score
  let score = 50;
  if (quote.price > sma50) score += 8;
  if (quote.price > sma200) score += 7;
  if (sma50 > sma200) score += 5;
  if (rsi14 >= 50 && rsi14 <= 70) score += 10;
  if (rsi14 > 70) score -= 5;
  if (rsi14 < 30) score -= 10;
  if (macdCross === "bullish") score += 12;
  if (macdCross === "bearish") score -= 8;
  if (macdHistogram > 0) score += 5;
  if (volumeRatio >= 2) score += 10;
  if (volumeRatio >= 1.5) score += 5;
  if (bbSqueeze) score += 8;
  if (daysToEarnings !== null && daysToEarnings <= 7) score += 5; // elevated IV = good for selling premium
  if (change5d > 5) score += 5;
  if (change20d > 10) score += 5;
  if (distFrom52High < 10) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    symbol,
    price: quote.price,
    name: quote.name,
    rsi14,
    macdLine: Math.round(macdLine * 100) / 100,
    macdSignal: Math.round(macdSignal * 100) / 100,
    macdHistogram: Math.round(macdHistogram * 100) / 100,
    macdCross,
    sma20,
    sma50,
    sma200,
    above20sma: quote.price > sma20,
    above50sma: quote.price > sma50,
    above200sma: sma200 > 0 && quote.price > sma200,
    goldenCross: sma50 > sma200 && closes.length >= 200,
    bbUpper: Math.round(bb.upper * 100) / 100,
    bbLower: Math.round(bb.lower * 100) / 100,
    bbSqueeze,
    bbPosition: Math.round(bbPosition * 100) / 100,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    volumeSpike: volumeRatio >= 2.5,
    distFrom52High: Math.round(distFrom52High * 10) / 10,
    distFrom52Low: Math.round(distFrom52Low * 10) / 10,
    change1d: Math.round(change1d * 100) / 100,
    change5d: Math.round(change5d * 100) / 100,
    change20d: Math.round(change20d * 100) / 100,
    nearestSupport: Math.round(support * 100) / 100,
    nearestResistance: Math.round(resistance * 100) / 100,
    earningsDate,
    daysToEarnings,
    score,
    signals,
  };
}

export async function analyzeMultiple(symbols: string[], quotes: QuoteData[]): Promise<TechnicalSignals[]> {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
  const results = await Promise.allSettled(
    symbols.filter((s) => quoteMap.has(s)).map((s) => analyzeTechnicals(s, quoteMap.get(s)!))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<TechnicalSignals> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.score - a.score);
}

/**
 * Format technical signals into a condensed text summary for Claude.
 * This is the key to reducing token usage — Claude gets pre-computed signals, not raw data.
 */
export function formatForClaude(signals: TechnicalSignals[]): string {
  return signals.map((s) => {
    const lines = [
      `${s.symbol} ($${s.price.toFixed(2)}) — Score: ${s.score}/100`,
      `  RSI: ${s.rsi14} | MACD: ${s.macdHistogram > 0 ? "+" : ""}${s.macdHistogram.toFixed(2)} (${s.macdCross !== "none" ? s.macdCross + " cross" : "no cross"})`,
      `  SMAs: ${s.above20sma ? ">" : "<"}20 ${s.above50sma ? ">" : "<"}50 ${s.above200sma ? ">" : "<"}200${s.goldenCross ? " [golden cross]" : ""}`,
      `  BB: ${s.bbSqueeze ? "SQUEEZE" : "normal"} position=${(s.bbPosition * 100).toFixed(0)}%`,
      `  Volume: ${s.volumeRatio}x avg${s.volumeSpike ? " SPIKE" : ""} | 1d: ${s.change1d > 0 ? "+" : ""}${s.change1d.toFixed(1)}% | 5d: ${s.change5d > 0 ? "+" : ""}${s.change5d.toFixed(1)}% | 20d: ${s.change20d > 0 ? "+" : ""}${s.change20d.toFixed(1)}%`,
      `  52w: ${s.distFrom52High.toFixed(0)}% below high, ${s.distFrom52Low.toFixed(0)}% above low`,
      `  S/R: support $${s.nearestSupport.toFixed(2)}, resistance $${s.nearestResistance.toFixed(2)}`,
      s.daysToEarnings !== null && s.daysToEarnings <= 30
        ? `  Earnings: in ${s.daysToEarnings} days (${s.earningsDate})`
        : `  Earnings: NONE UPCOMING`,
      s.signals.length > 0 ? `  Signals: ${s.signals.join(", ")}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }).join("\n\n");
}
