import { analyzeTechnicals, type TechnicalSignals } from "@/lib/analysis/technicals";
import { getEarningsCalendar, knownTiming } from "@/lib/market/earnings";
import { getPastEarnings, type PastEarning } from "@/lib/market/earnings-history";
import { getHistory, type DailyBar } from "@/lib/market/history";
import { getRecentHeadlines } from "@/lib/market/yahoo-news";
import { getOptionsChain, getQuote } from "@/lib/market/yahoo";
import type { OptionContract } from "@/lib/market/types";
import { analyzeNewsBatch, type NewsSentiment } from "@/lib/news/sentiment";
import {
  atmStraddle, contractIv, expiryTime, splitVol, yearsBetween,
} from "@/lib/options/earnings-model";
import { buildStrategies, type Bias, type IvRegime } from "@/lib/options/earnings-strategies";
import { addDays, daysBetween, etToday, isWeekend } from "@/lib/paper/dates";
import type { AnalysisResult, BiasDriver, EarningsPlayAnalysis, PastReaction, Timing } from "./types";

const TIMING_LABEL: Record<Timing, string> = { before_market: "before the open", after_market: "after the close", unknown: "" };
const MAX_DAYS_OUT = 45;

function nextTradingDay(date: string): string {
  let d = addDays(date, 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

function prevTradingDay(date: string): string {
  let d = addDays(date, -1);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}

/**
 * The clock option prices were struck at: now during the session, else the
 * last close. Weekend chains carry Friday's IVs, which were computed with
 * Friday's time-to-expiry.
 */
function pricingClock(now: Date): Date {
  const today = etToday(now);
  const minutesEt = (now.getUTCHours() - 4) * 60 + now.getUTCMinutes();
  const open = !isWeekend(today) && minutesEt >= 570 && minutesEt <= 960;
  if (open) return now;
  const lastSession = !isWeekend(today) && minutesEt > 960 ? today : prevTradingDay(today);
  return new Date(`${lastSession}T20:00:00Z`);
}

function move(bars: DailyBar[], i: number): number | null {
  return i > 0 && i < bars.length && bars[i - 1].close > 0 ? (bars[i].close / bars[i - 1].close - 1) * 100 : null;
}

/** How the stock actually reacted to each of the last four reports. */
function reportedReactions(bars: DailyBar[], reports: PastEarning[], timing: Timing): PastReaction[] {
  const out: PastReaction[] = [];
  for (const r of reports.slice(0, 4)) {
    const i = bars.findIndex((b) => b.date >= r.reportDate);
    if (i < 0) continue;
    // After the close reacts the next session; before the open reacts the same day. Unknown: whichever moved more.
    const candidates = (timing === "after_market" ? [i + 1] : timing === "before_market" ? [i] : [i, i + 1])
      .map((j) => ({ j, m: move(bars, j) }))
      .filter((x): x is { j: number; m: number } => x.m != null);
    const best = candidates.sort((a, b) => Math.abs(b.m) - Math.abs(a.m))[0];
    if (!best) continue;
    out.push({
      date: bars[best.j].date, reportDate: r.reportDate, fiscalQuarter: r.fiscalQuarter || null,
      movePct: best.m, surprisePct: r.surprisePct, source: "reported",
    });
  }
  return out;
}

/** Fallback without report history: biggest one-day move within ±12 days of where each report should have landed. */
function estimatedReactions(bars: DailyBar[], earningsDate: string): PastReaction[] {
  const out: PastReaction[] = [];
  for (let k = 1; k <= 4; k++) {
    const center = addDays(earningsDate, -91 * k);
    const lo = addDays(center, -12);
    const hi = addDays(center, 12);
    let best: PastReaction | null = null;
    for (let i = 1; i < bars.length; i++) {
      if (bars[i].date < lo || bars[i].date > hi) continue;
      const m = move(bars, i);
      if (m != null && (!best || Math.abs(m) > Math.abs(best.movePct))) {
        best = { date: bars[i].date, reportDate: null, fiscalQuarter: null, movePct: m, surprisePct: null, source: "estimated" };
      }
    }
    if (best) out.push(best);
  }
  return out;
}

/** Annualised 30-session vol, leaving out the earnings-reaction days so they don't inflate the base. */
function realizedVol(bars: DailyBar[], skip: Set<string>): number | null {
  const rets: number[] = [];
  for (let i = bars.length - 1; i > 0 && rets.length < 30; i--) {
    if (skip.has(bars[i].date) || !(bars[i - 1].close > 0)) continue;
    rets.push(Math.log(bars[i].close / bars[i - 1].close));
  }
  if (rets.length < 15) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance * 252);
}

function readBias(t: TechnicalSignals, news: NewsSentiment | undefined): { bias: Bias; score: number; drivers: BiasDriver[] } {
  const d: BiasDriver[] = [];
  const add = (label: string, weight: number) => { if (weight !== 0) d.push({ label, weight }); };
  add(t.above50sma ? `above the 50-day ($${t.sma50.toFixed(2)})` : `below the 50-day ($${t.sma50.toFixed(2)})`, t.above50sma ? 0.2 : -0.2);
  if (t.sma200 > 0) add(t.above200sma ? "above the 200-day" : "below the 200-day", t.above200sma ? 0.15 : -0.15);
  add(`${t.change20d >= 0 ? "+" : ""}${t.change20d.toFixed(1)}% over 20 sessions`, Math.max(-1, Math.min(1, t.change20d / 15)) * 0.2);
  add(t.macdHistogram > 0 ? "MACD above its signal line" : "MACD below its signal line", t.macdHistogram > 0 ? 0.1 : -0.1);
  if (t.macdCross !== "none") add(`fresh ${t.macdCross} MACD cross`, t.macdCross === "bullish" ? 0.05 : -0.05);
  if (t.rsi14 > 70) add(`RSI ${t.rsi14.toFixed(0)} — stretched going into the print`, -0.1);
  if (t.rsi14 < 30) add(`RSI ${t.rsi14.toFixed(0)} — oversold going into the print`, 0.1);
  if (news && news.headlineCount > 0 && news.score !== 0) {
    add(`news ${news.score > 0 ? "positive" : "negative"}${news.keywordFlags.length ? ` (${news.keywordFlags.join(", ").replace(/_/g, " ")})` : ""}`, (news.score / 2) * 0.2);
  }
  d.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  const score = Math.max(-1, Math.min(1, d.reduce((s, x) => s + x.weight, 0)));
  return { bias: score >= 0.2 ? "bullish" : score <= -0.2 ? "bearish" : "neutral", score, drivers: d };
}

function regimeOf(implied: number, hist: number | null): IvRegime {
  if (hist == null || hist <= 0) return "unknown";
  const r = implied / hist;
  return r > 1.15 ? "rich" : r < 0.85 ? "cheap" : "fair";
}

async function chainFor(symbol: string, expiry: string): Promise<OptionContract[]> {
  const c = await getOptionsChain(symbol, expiry);
  return c ? [...c.calls, ...c.puts].filter((x) => x.expiry === expiry) : [];
}

export async function analyzeEarningsPlay(rawSymbol: string, now = new Date()): Promise<AnalysisResult> {
  const symbol = rawSymbol.toUpperCase();
  const today = etToday(now);

  const [quote, calendar] = await Promise.all([getQuote(symbol), getEarningsCalendar([symbol])]);
  if (!quote || !(quote.price > 0)) return { ok: false, symbol, reason: `No quote for ${symbol}.` };
  const event = calendar.find((e) => e.symbol === symbol && e.earningsDate >= today);
  if (!event) return { ok: false, symbol, reason: `${symbol} has no earnings report on the calendar.` };
  const daysUntil = daysBetween(today, event.earningsDate);
  if (daysUntil > MAX_DAYS_OUT) {
    return { ok: false, symbol, reason: `${symbol} next reports ${event.earningsDate} — too far out to price an earnings trade yet.` };
  }

  const timing: Timing = event.timing !== "unknown" ? event.timing : knownTiming(symbol);
  // Unknown timing: enter the session before and exit the session after, which is safe either way.
  const entryDate = timing === "after_market" ? event.earningsDate : prevTradingDay(event.earningsDate);
  const exitDate = timing === "before_market" ? event.earningsDate : nextTradingDay(event.earningsDate);

  const listing = await getOptionsChain(symbol);
  const expirations = (listing?.expirations ?? []).filter((e) => e > exitDate).sort();
  const [frontExpiry, backExpiry] = expirations;
  if (!frontExpiry) return { ok: false, symbol, reason: `No ${symbol} option expiry after ${exitDate}.` };

  const [front, back, bars, technicals, sentiment, headlines, reports] = await Promise.all([
    chainFor(symbol, frontExpiry),
    backExpiry ? chainFor(symbol, backExpiry) : Promise.resolve([] as OptionContract[]),
    getHistory(symbol, 400),
    analyzeTechnicals(symbol, quote),
    analyzeNewsBatch([symbol], { skipLLM: true }),
    getRecentHeadlines(symbol, 6),
    getPastEarnings(symbol),
  ]);

  const spot = quote.price;
  const straddle = atmStraddle(front, spot);
  if (!straddle || straddle.cost <= 0) return { ok: false, symbol, reason: `No usable ${symbol} options around $${spot.toFixed(2)} for ${frontExpiry}.` };

  const clock = pricingClock(now);
  const tFront = yearsBetween(clock, expiryTime(frontExpiry));
  const tBack = backExpiry ? yearsBetween(clock, expiryTime(backExpiry)) : null;
  const atmIv = (chain: OptionContract[], t: number): number | null => {
    const s = atmStraddle(chain, spot);
    if (!s) return null;
    const ivs = [contractIv(s.call, spot, t), contractIv(s.put, spot, t)].filter((v): v is number => v != null);
    return ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;
  };
  const frontIv = atmIv(front, tFront);
  if (frontIv == null) return { ok: false, symbol, reason: `Couldn't read implied volatility on the ${symbol} ${frontExpiry} chain.` };
  const backIv = tBack != null ? atmIv(back, tBack) : null;

  const reported = reportedReactions(bars, reports.filter((r) => r.reportDate < today), timing);
  const reactions = reported.length >= 2 ? reported : estimatedReactions(bars, event.earningsDate);
  const histAvg = reactions.length >= 2 ? reactions.reduce((s, r) => s + Math.abs(r.movePct), 0) / reactions.length : null;
  const vol = splitVol({ frontIv, backIv, tFront, tBack, realizedVol: realizedVol(bars, new Set(reactions.map((r) => r.date))) });

  const news = sentiment.get(symbol);
  const { bias, score, drivers } = readBias(technicals, news);
  const regime = regimeOf(straddle.movePct, histAvg);
  const timingLabel = TIMING_LABEL[timing];

  const strategies = buildStrategies(
    {
      symbol, spot, earningsDate: event.earningsDate, timingLabel, entryDate, exitDate, expiry: frontExpiry,
      bias, biasScore: score, drivers: drivers.map((x) => x.label), impliedMovePct: straddle.movePct,
      histAvgMovePct: histAvg, regime, vol,
    },
    front,
    { spot, tExit: yearsBetween(new Date(`${exitDate}T16:00:00Z`), expiryTime(frontExpiry)), crushRatio: vol.crushRatio },
    tFront,
  );

  const closes = bars.map((b) => b.close);
  const chart = bars.slice(-65).map((b, i, arr) => {
    const idx = bars.length - arr.length + i;
    const window = closes.slice(Math.max(0, idx - 49), idx + 1);
    return { date: b.date, close: b.close, sma50: window.length === 50 ? window.reduce((a, c) => a + c, 0) / 50 : null };
  });
  if (chart.length && chart[chart.length - 1].date < today) chart.push({ date: today, close: spot, sma50: chart[chart.length - 1].sma50 });

  const analysis: EarningsPlayAnalysis = {
    symbol, name: quote.name || event.name, asOf: now.toISOString(), spot, changePct: quote.changePct,
    earningsDate: event.earningsDate, timing, timingLabel, daysUntil, entryDate, exitDate, expiry: frontExpiry,
    impliedMovePct: straddle.movePct, impliedMoveUsd: straddle.cost, straddleStrike: straddle.strike,
    vol, pastReactions: reactions, histAvgMovePct: histAvg, regime, bias, biasScore: score, drivers,
    technicals: {
      rsi14: technicals.rsi14, sma20: technicals.sma20, sma50: technicals.sma50, sma200: technicals.sma200,
      change5d: technicals.change5d, change20d: technicals.change20d,
      support: technicals.nearestSupport, resistance: technicals.nearestResistance, signals: technicals.signals,
    },
    news: {
      score: news?.score ?? 0,
      oneLine: news?.oneLine ?? "No recent headlines.",
      flags: news?.keywordFlags ?? [],
      headlines: headlines.map((h) => ({ title: h.title, url: h.url, publisher: h.publisher, publishedAt: h.published_at })),
    },
    chart, strategies, thesis: null,
  };
  return { ok: true, analysis };
}
