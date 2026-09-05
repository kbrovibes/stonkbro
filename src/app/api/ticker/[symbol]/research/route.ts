/**
 * Ticker research — the data behind the refresh Research screen.
 *
 * Four parts, requested separately so the screen can paint the cheap ones
 * first and let the expensive ones land underneath:
 *
 *   GET ?part=snapshot   chart series + the IV / IVR / RSI / RVOL strip
 *   GET ?part=structure  the one CSP that fits the account's cash
 *   GET ?part=earnings   last 8 earnings reactions vs the implied move
 *   POST                 the Claude answer, and every follow-up after it
 *
 * Everything here is derived from the existing market/options/AI modules.
 * Nothing in `src/lib` is modified — the derivations that only this screen
 * needs (the IV-rank proxy, the earnings-reaction detector) live here.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getQuote } from "@/lib/market/yahoo";
import { getHistory, type DailyBar } from "@/lib/market/history";
import { tradierGetExpirations, tradierGetOptionsChain } from "@/lib/market/tradier";
import type { OptionContract, QuoteData } from "@/lib/market/types";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { getSectorForTicker } from "@/lib/market/sectors";
import { analyzeTechnicals } from "@/lib/analysis/technicals";
import { scanTickerCSPs, type CSPHunterCandidate } from "@/lib/options/csp-scanner";
import { getPortfolio } from "@/lib/snaptrade/client";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { generateText } from "@/lib/ai/provider";
import type {
  EarningsReaction,
  ResearchAnswer,
  ResearchEarnings,
  ResearchSnapshot,
  ResearchStructure,
} from "@/components/refresh-screens/research-types";

export const maxDuration = 60;

const CHART_SESSIONS = 60;
/** 8 quarters of reactions, plus a year of vol readings before the first. */
const HISTORY_DAYS = 780;
/** Trading days in a year — the window the IVR proxy ranks against. */
const VOL_WINDOW = 252;
const VOL_LOOKBACK = 20;
const QUARTER_DAYS = 91;
/** Sessions either side of an estimated report date to hunt the reaction in. */
const REACTION_WINDOW = 10;

// ---------------------------------------------------------------------------
// A short per-process cache
// ---------------------------------------------------------------------------

/**
 * The snapshot and the earnings block both want the same two years of bars
 * and the same expiration list, and they arrive as two separate requests —
 * `tradierHistory` sets no `revalidate`, so without this the screen pays for
 * the heaviest fetch on the page twice. Five minutes is well inside the
 * lifetime of a daily bar.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as Promise<T>;

  const value = load().catch((e) => {
    // A rejection must not be cached, or one blip poisons the next 5 minutes.
    cache.delete(key);
    throw e;
  });
  cache.set(key, { at: Date.now(), value });

  // The map is keyed by symbol and only this screen writes to it, but an
  // unbounded map in a long-lived process is still a leak.
  if (cache.size > 200) {
    for (const [k, v] of cache) if (Date.now() - v.at > CACHE_TTL_MS) cache.delete(k);
  }
  return value;
}

/** The bar history both parts share. */
function bars(symbol: string): Promise<DailyBar[]> {
  return cached(`history:${symbol}`, () => getHistory(symbol, HISTORY_DAYS)).catch(
    () => [] as DailyBar[]
  );
}

function expirations(symbol: string): Promise<string[]> {
  return cached(`expirations:${symbol}`, () => tradierGetExpirations(symbol)).catch(
    () => [] as string[]
  );
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/** Mid, falling back to the last trade when a side of the book is empty. */
function contractMid(c: OptionContract): number {
  if (c.mid > 0) return c.mid;
  if (c.bid > 0 && c.ask > 0) return (c.bid + c.ask) / 2;
  return c.lastPrice;
}

function contractIv(c: OptionContract): number | null {
  const iv = c.iv ?? c.impliedVolatility;
  return typeof iv === "number" && iv > 0 ? iv : null;
}

function nearestStrike(contracts: OptionContract[], price: number): OptionContract | null {
  let best: OptionContract | null = null;
  let bestGap = Infinity;
  for (const c of contracts) {
    const gap = Math.abs(c.strike - price);
    if (gap < bestGap) {
      bestGap = gap;
      best = c;
    }
  }
  return best;
}

/**
 * The at-the-money straddle for one expiry: its implied vol, and its cost as a
 * fraction of spot — which is the market's implied move into that expiry.
 */
async function atmStraddle(
  symbol: string,
  expiry: string,
  price: number
): Promise<{ iv: number | null; impliedMovePct: number | null }> {
  const chain = await tradierGetOptionsChain(symbol, expiry).catch(() => null);
  if (!chain) return { iv: null, impliedMovePct: null };

  const call = nearestStrike(chain.calls, price);
  const put = nearestStrike(chain.puts, price);
  if (!call || !put) return { iv: null, impliedMovePct: null };

  const ivs = [contractIv(call), contractIv(put)].filter((v): v is number => v !== null);
  const iv = ivs.length > 0 ? (ivs.reduce((s, v) => s + v, 0) / ivs.length) * 100 : null;

  const straddle = contractMid(call) + contractMid(put);
  const impliedMovePct = straddle > 0 && price > 0 ? (straddle / price) * 100 : null;

  return { iv, impliedMovePct };
}

/**
 * The IVR slot's number.
 *
 * A real IV rank needs a year of daily implied-vol readings and no source in
 * this app stores one — Tradier hands back today's chain and nothing else. So
 * this ranks today's 20-day *realized* volatility inside the last year of the
 * same reading, and reports it as a **percentile** (the share of the year's
 * readings at or below today) rather than a min–max rank.
 *
 * That choice is not cosmetic. A single earnings gap sits inside 20 rolling
 * windows and drags the year's maximum up with it, which makes a min–max rank
 * read near zero for months at a time: on regime-shifted test series the rank
 * swung 3→32 and 16→66 purely on whether gaps were present, while the
 * percentile moved 10→13 and 25→63. The percentile tracks the volatility
 * regime; the rank mostly tracks the worst day of the year.
 *
 * Returns null when there is not enough history to rank against — the strip
 * renders an em dash rather than a number we cannot stand behind.
 */
function realizedVolPercentile(bars: DailyBar[]): number | null {
  if (bars.length < VOL_LOOKBACK + VOL_WINDOW / 2) return null;

  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].close;
    if (prev > 0) returns.push(Math.log(bars[i].close / prev));
  }
  if (returns.length < VOL_LOOKBACK * 2) return null;

  const vols: number[] = [];
  for (let i = VOL_LOOKBACK; i <= returns.length; i++) {
    const win = returns.slice(i - VOL_LOOKBACK, i);
    const mean = win.reduce((s, r) => s + r, 0) / win.length;
    const variance = win.reduce((s, r) => s + (r - mean) ** 2, 0) / win.length;
    vols.push(Math.sqrt(variance * 252));
  }

  const recent = vols.slice(-VOL_WINDOW);
  const current = recent[recent.length - 1];
  const below = recent.filter((v) => v <= current).length;
  return Math.round((below / recent.length) * 100);
}

async function buildSnapshot(symbol: string, quote: QuoteData): Promise<ResearchSnapshot> {
  const [history, technicals, iv] = await Promise.all([
    bars(symbol),
    analyzeTechnicals(symbol, quote).catch(() => null),
    frontMonthIv(symbol, quote.price),
  ]);

  const closes = history.map((b) => b.close);

  return {
    symbol: quote.symbol,
    name: quote.name,
    sector: getSectorForTicker(quote.symbol)?.name ?? null,
    price: quote.price,
    changePct: quote.changePct,
    chart: closes.slice(-CHART_SESSIONS),
    iv,
    ivRank: realizedVolPercentile(history),
    ivRankIsProxy: true,
    rsi: technicals ? Math.round(technicals.rsi14) : null,
    relativeVolume: quote.volumeRatio > 0 ? quote.volumeRatio : null,
  };
}

/** ATM implied vol from the first expiry at least three weeks out. */
async function frontMonthIv(symbol: string, price: number): Promise<number | null> {
  const expiry = await pickExpiry(symbol, (dte) => dte >= 21);
  if (!expiry) return null;
  const { iv } = await atmStraddle(symbol, expiry, price);
  return iv;
}

async function pickExpiry(
  symbol: string,
  accept: (dte: number) => boolean
): Promise<string | null> {
  const now = Date.now();
  for (const exp of await expirations(symbol)) {
    const dte = Math.ceil((new Date(exp).getTime() - now) / 86_400_000);
    if (accept(dte)) return exp;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Suggested structure
// ---------------------------------------------------------------------------

/**
 * Cash the account can actually put behind a put, or null when we have no
 * brokerage link to ask. `FITS YOUR CAPITAL` is only truthful with a number.
 */
async function accountCash(email: string | null | undefined): Promise<number | null> {
  if (!hasPortfolioAccess(email)) return null;
  try {
    const portfolio = await getPortfolio();
    const cash = portfolio.summary.cash;
    return Number.isFinite(cash) && cash > 0 ? cash : null;
  } catch {
    return null;
  }
}

/** Premium over collateral, scaled to a 30-day month. */
function monthlyRoc(c: CSPHunterCandidate): number {
  if (c.collateralRequired <= 0 || c.dte <= 0) return 0;
  return (c.premium / c.collateralRequired) * (30 / c.dte) * 100;
}

function toStructure(c: CSPHunterCandidate, cash: number | null): ResearchStructure {
  return {
    strategy: "CSP",
    strike: c.strike,
    expiry: c.expiry,
    dte: c.dte,
    delta: Math.abs(c.delta),
    collateral: c.collateralRequired,
    monthlyRoc: monthlyRoc(c),
    fitsCapital: cash === null ? null : c.collateralRequired <= cash,
  };
}

/**
 * The suggested structure, plus the rest of the scan behind `Full chain`.
 */
async function buildStructure(
  symbol: string,
  email: string | null | undefined
): Promise<{ pick: ResearchStructure | null; chain: ResearchStructure[] }> {
  const cash = await accountCash(email);
  const candidates = await scanTickerCSPs(symbol, cash ?? 100_000).catch(
    () => [] as CSPHunterCandidate[]
  );
  if (candidates.length === 0) return { pick: null, chain: [] };

  // `scanTickerCSPs` already returns its own ranking; take the best one the
  // account can actually collateralise rather than re-ranking it here.
  const affordable = cash === null
    ? candidates
    : candidates.filter((c) => c.collateralRequired <= cash);
  const pick = (affordable.length > 0 ? affordable : candidates)[0];

  return {
    pick: toStructure(pick, cash),
    chain: candidates.map((c) => toStructure(c, cash)),
  };
}

// ---------------------------------------------------------------------------
// Earnings history
// ---------------------------------------------------------------------------

/**
 * The reaction to a report the app has no recorded date for.
 *
 * Historical earnings dates are not stored anywhere in this app — the
 * earnings module only resolves the *next* one. So each prior quarter is
 * estimated by stepping back 91 days from the next report, and the reaction
 * is taken as the largest single-session move inside a ±10-session window
 * around that estimate. An earnings gap is nearly always the biggest move in
 * its month, which is what makes the window self-correcting.
 */
function reactionNear(bars: DailyBar[], targetDate: Date): EarningsReaction | null {
  const target = targetDate.toISOString().slice(0, 10);

  let anchor = -1;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date >= target) {
      anchor = i;
      break;
    }
  }
  if (anchor <= 0) return null;

  const from = Math.max(1, anchor - REACTION_WINDOW);
  const to = Math.min(bars.length - 1, anchor + REACTION_WINDOW);

  let best: EarningsReaction | null = null;
  for (let i = from; i <= to; i++) {
    const prev = bars[i - 1].close;
    if (prev <= 0) continue;
    const movePct = ((bars[i].close - prev) / prev) * 100;
    if (!best || Math.abs(movePct) > Math.abs(best.movePct)) {
      best = { date: bars[i].date, movePct };
    }
  }
  return best;
}

async function nextEarningsDate(symbol: string, quote: QuoteData): Promise<Date | null> {
  if (quote.earningsDate) {
    const d = new Date(quote.earningsDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  try {
    const [event] = await getEarningsCalendar([symbol]);
    if (event?.earningsDate) {
      const d = new Date(event.earningsDate);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function buildEarnings(symbol: string, quote: QuoteData): Promise<ResearchEarnings> {
  const empty: ResearchEarnings = {
    reactions: [],
    avgMovePct: null,
    impliedMovePct: null,
    upCount: 0,
    total: 0,
  };

  const next = await nextEarningsDate(symbol, quote);
  if (!next) return empty;

  const history = await bars(symbol);
  if (history.length === 0) return empty;

  const reactions: EarningsReaction[] = [];
  const seen = new Set<string>();
  for (let q = 8; q >= 1; q--) {
    const estimate = new Date(next.getTime() - q * QUARTER_DAYS * 86_400_000);
    const reaction = reactionNear(history, estimate);
    // The ±10-session windows of two adjacent quarters can overlap and land on
    // the same session; a duplicate bar would double-count that move.
    if (reaction && !seen.has(reaction.date)) {
      seen.add(reaction.date);
      reactions.push(reaction);
    }
  }
  if (reactions.length === 0) return empty;

  const avgMovePct =
    reactions.reduce((s, r) => s + Math.abs(r.movePct), 0) / reactions.length;

  // The implied move is the ATM straddle for the first expiry that actually
  // contains the next report — anything earlier prices a different event.
  const earningsTime = next.getTime();
  const expiry = await pickExpiry(symbol, (dte) => {
    const expiryTime = Date.now() + dte * 86_400_000;
    return expiryTime >= earningsTime;
  });
  const implied = expiry ? await atmStraddle(symbol, expiry, quote.price) : null;

  return {
    reactions,
    avgMovePct,
    impliedMovePct: implied?.impliedMovePct ?? null,
    upCount: reactions.filter((r) => r.movePct > 0).length,
    total: reactions.length,
  };
}

// ---------------------------------------------------------------------------
// The Claude answer
// ---------------------------------------------------------------------------

const ANSWER_SYSTEM = `You are an options strategist writing for a screen that is 440 points wide.
Answer in at most three sentences of plain prose — no headings, no lists, no markdown, no preamble.
Say what actually decides the trade, not what the numbers already show on screen.`;

function buildAskPrompt(
  quote: QuoteData,
  structure: ResearchStructure | null,
  question: string | null
): string {
  const context = [
    `${quote.symbol} — ${quote.name}`,
    `Price $${quote.price.toFixed(2)} (${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}% today)`,
    `Volume ${quote.volumeRatio.toFixed(1)}x average`,
    `50-day SMA $${quote.fiftyDayAvg.toFixed(2)} (${quote.above50sma ? "above" : "below"})`,
    `200-day SMA $${quote.twoHundredDayAvg.toFixed(2)} (${quote.above200sma ? "above" : "below"})`,
    `52-week range $${quote.fiftyTwoWeekLow.toFixed(2)} – $${quote.fiftyTwoWeekHigh.toFixed(2)}`,
    quote.earningsDate ? `Next earnings ${quote.earningsDate}` : "Next earnings unknown",
    structure
      ? `Scanner's best put: ${structure.strike}P expiring ${structure.expiry}, ${structure.dte} DTE, ${structure.delta.toFixed(2)} delta, ${structure.monthlyRoc.toFixed(1)}% monthly return on collateral`
      : "No cash-secured put currently clears the scanner's filters.",
  ].join("\n");

  if (question) {
    return `${context}\n\nThe user asks: ${question}\n\nAnswer in at most three sentences. Return only:\nANSWER: <your answer>`;
  }

  return `${context}\n\nWrite the opening read on this ticker for a premium seller.\n\nReturn exactly three lines and nothing else:\nANSWER: <at most three sentences>\nBULL: <one clause, at most six words, no trailing punctuation>\nBEAR: <one clause, at most six words, no trailing punctuation>`;
}

/** Narrow the structure the client echoes back, so it can only reach the prompt as numbers. */
function readStructure(input: unknown): ResearchStructure | null {
  if (!input || typeof input !== "object") return null;
  const s = input as Record<string, unknown>;
  const num = (k: string) => (typeof s[k] === "number" && Number.isFinite(s[k]) ? (s[k] as number) : null);

  const strike = num("strike");
  const dte = num("dte");
  const delta = num("delta");
  const monthlyRoc = num("monthlyRoc");
  const expiry = typeof s.expiry === "string" ? s.expiry.slice(0, 10) : null;
  if (strike === null || dte === null || delta === null || monthlyRoc === null || !expiry) {
    return null;
  }

  return {
    strategy: "CSP",
    strike,
    expiry,
    dte,
    delta,
    collateral: num("collateral") ?? strike * 100,
    monthlyRoc,
    fitsCapital: typeof s.fitsCapital === "boolean" ? s.fitsCapital : null,
  };
}

function parseAnswer(text: string): { answer: string; bull: string | null; bear: string | null } {
  const line = (label: string): string | null => {
    const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    return match ? match[1].trim().replace(/[.\s]+$/, "") || null : null;
  };

  const answer = line("ANSWER") ?? text.replace(/^(BULL|BEAR):.*$/gim, "").trim();
  return { answer, bull: line("BULL"), bear: line("BEAR") };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol: raw } = await params;
  const symbol = raw?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const part = new URL(request.url).searchParams.get("part") ?? "snapshot";

  const quote = await getQuote(symbol);
  if (!quote) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });

  try {
    if (part === "structure") {
      const { pick, chain } = await buildStructure(symbol, user.email);
      return NextResponse.json({ structure: pick, chain });
    }
    if (part === "earnings") {
      return NextResponse.json({ earnings: await buildEarnings(symbol, quote) });
    }
    return NextResponse.json({ snapshot: await buildSnapshot(symbol, quote) });
  } catch (error) {
    console.error(`[ticker-research] ${symbol} ${part} failed`, error);
    return NextResponse.json({ error: "Could not build that section" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol: raw } = await params;
  const symbol = raw?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const question =
    typeof body.question === "string" && body.question.trim().length > 0
      ? body.question.trim().slice(0, 500)
      : null;

  const quote = await getQuote(symbol);
  if (!quote) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });

  // The screen has already fetched the structure by the time it asks, and it
  // passes it back so the prose can't contradict the contract sitting under
  // it. Re-scanning the chain here would just buy the same answer twice.
  const structure = readStructure(body.structure);

  try {
    const result = await generateText({
      prompt: buildAskPrompt(quote, structure, question),
      systemPrompt: ANSWER_SYSTEM,
      maxTokens: 500,
      feature: "ticker-research",
      userId: user.id,
    });

    const parsed = parseAnswer(result.text ?? "");
    if (!parsed.answer) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    const answer: ResearchAnswer = { ...parsed, provider: result.provider };
    return NextResponse.json({ answer });
  } catch (error) {
    console.error(`[ticker-research] ${symbol} answer failed`, error);
    return NextResponse.json({ error: "Research is unavailable right now" }, { status: 502 });
  }
}
