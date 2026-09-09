/**
 * Option chains for dates that have already happened.
 *
 * Tradier serves option chains for *now* and nothing else, so a backfill over
 * a past month has no chain to fetch. This module builds one: a strike grid
 * around the day's underlying price, priced with the same Black-Scholes the
 * broker already falls back to, off a volatility estimated from that symbol's
 * own realised moves up to (and not past) the simulated date.
 *
 * It is a model, not a recording. Marks are theoretical, the skew is a crude
 * linear tilt, and there is no term structure beyond what Black-Scholes gives
 * for free. Every report built on it has to say so.
 */
import type { OptionContract } from "@/lib/market/types";
import type { DailyBar } from "@/lib/market/history";
import { addDays, dteOn, isoDate } from "./dates";
import { bsDelta, bsPrice } from "./pricing";
import type { ChainNeed } from "./types";

export interface SyntheticConfig {
  /** Annualised volatility per symbol, as of the simulated date. */
  vol: Map<string, number>;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Annualised close-to-close volatility over the last `n` bars. */
export function realizedVol(bars: DailyBar[], n = 60): number {
  const closes = bars.slice(-(n + 1)).map((b) => b.close).filter((c) => c > 0);
  if (closes.length < 12) return 0.32;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return clamp(Math.sqrt(variance * 252), 0.1, 1.5);
}

function nextFriday(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const shift = (5 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + shift);
  return isoDate(d);
}

/** The next `weeks` Friday expiries strictly after `date`. */
export function weeklyExpiries(date: string, weeks: number): string[] {
  const out: string[] = [];
  let d = nextFriday(date);
  for (let i = 0; i < weeks; i++) {
    out.push(d);
    d = addDays(d, 7);
  }
  return out;
}

/** The third Friday of each of the next `months` months. */
export function monthlyExpiries(date: string, months: number): string[] {
  const out: string[] = [];
  const start = new Date(`${date}T12:00:00Z`);
  for (let i = 0; i <= months; i++) {
    const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1, 12));
    const shift = (5 - first.getUTCDay() + 7) % 7;
    first.setUTCDate(1 + shift + 14);
    const iso = isoDate(first);
    if (iso > date) out.push(iso);
  }
  return out;
}

function strikeStep(spot: number): number {
  if (spot < 25) return 1;
  if (spot < 100) return 2.5;
  return 5;
}

/** Strikes widen with time to expiry — a LEAPS grid has to reach 0.75 delta. */
function strikesFor(spot: number, dte: number): number[] {
  const step = strikeStep(spot);
  const width = clamp(0.1 + 0.6 * Math.sqrt(Math.max(1, dte) / 365), 0.14, 0.55);
  const lo = Math.max(step, Math.floor((spot * (1 - width)) / step) * step);
  const hi = Math.ceil((spot * (1 + width)) / step) * step;
  const out: number[] = [];
  for (let k = lo; k <= hi + 1e-9; k += step) out.push(Number(k.toFixed(2)));
  return out;
}

/** Downside strikes carry more vol, the way index and single-name skew actually sits. */
function skewedVol(baseVol: number, spot: number, strike: number): number {
  return clamp(baseVol * (1 + 0.45 * (1 - strike / spot)), 0.08, 2.5);
}

export function buildContract(
  type: "call" | "put",
  spot: number,
  strike: number,
  expiry: string,
  date: string,
  baseVol: number,
): OptionContract {
  const dte = dteOn(expiry, date);
  const iv = skewedVol(baseVol, spot, strike);
  const t = Math.max(dte, 0.5) / 365;
  const theo = bsPrice(type, spot, strike, t, iv);
  const spread = clamp(Math.max(0.02, theo * 0.035), 0.02, Math.max(0.05, spot * 0.004));
  const bid = Math.max(0.01, Number((theo - spread / 2).toFixed(2)));
  const ask = Number((theo + spread / 2).toFixed(2));
  const mid = Number(((bid + ask) / 2).toFixed(4));
  const moneyness = Math.abs(1 - strike / spot);
  return {
    strike,
    expiry,
    dte,
    type,
    bid,
    ask,
    mid,
    lastPrice: mid,
    // Liquidity is a shape, not a recording: richest at the money, thinning out.
    volume: Math.round(4000 * Math.exp(-14 * moneyness)) + 5,
    openInterest: Math.round(30000 * Math.exp(-10 * moneyness)) + 50,
    impliedVolatility: iv,
    iv,
    inTheMoney: type === "call" ? spot > strike : spot < strike,
    delta: bsDelta(type, spot, strike, t, iv),
  };
}

export interface SyntheticRequest {
  symbol: string;
  expiries: string[];
  /** Exact contracts that must exist regardless of the grid — open positions. */
  pinned: Array<{ type: "call" | "put"; strike: number; expiry: string }>;
}

/** Every expiry a set of needs could resolve to, plus the ones already held. */
export function expiriesForNeeds(needs: ChainNeed[], date: string): string[] {
  if (needs.length === 0) return [];
  const maxDte = Math.max(...needs.map((n) => n.maxDte));
  const pool = [
    ...weeklyExpiries(date, Math.min(10, Math.ceil(Math.min(maxDte, 70) / 7) + 1)),
    ...monthlyExpiries(date, Math.ceil(maxDte / 30) + 1),
  ];
  const unique = [...new Set(pool)].sort();
  return unique.filter((e) => needs.some((n) => {
    const d = dteOn(e, date);
    return d >= n.minDte && d <= n.maxDte;
  }));
}

export function generateChain(req: SyntheticRequest, spot: number, date: string, baseVol: number): OptionContract[] {
  const out: OptionContract[] = [];
  const seen = new Set<string>();
  const push = (type: "call" | "put", strike: number, expiry: string) => {
    const key = `${type}:${strike}:${expiry}`;
    if (seen.has(key) || strike <= 0) return;
    seen.add(key);
    out.push(buildContract(type, spot, strike, expiry, date, baseVol));
  };
  for (const expiry of req.expiries) {
    for (const strike of strikesFor(spot, dteOn(expiry, date))) {
      push("call", strike, expiry);
      push("put", strike, expiry);
    }
  }
  for (const p of req.pinned) push(p.type, p.strike, p.expiry);
  return out;
}
