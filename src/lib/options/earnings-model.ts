/**
 * Earnings-trade pricing model. Pure functions, no I/O.
 *
 * Every structure is valued at the moment we plan to close it — the first
 * session after the report — not at expiry. Two things change between entry
 * and exit: the stock moves (the scenario) and implied vol collapses once the
 * event is out. The collapse is estimated by splitting the front expiry's IV
 * into an ordinary "base" vol plus a one-off event jump, using the next
 * expiry out as the second equation.
 */
import type { OptionContract } from "@/lib/market/types";
import { bsPrice } from "@/lib/paper/pricing";

const YEAR_MS = 365 * 86_400_000;
const MIN_T = 1 / (365 * 24);
export const COMMISSION = 0.65;
/** Fills assumed this fraction of the bid/ask spread away from mid, on the way in and out. */
export const SLIPPAGE = 0.1;

export const SCENARIO_MOVES = [-10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10];

/** 4pm ET on the expiry date (EDT offset — a few minutes off in winter is immaterial here). */
export function expiryTime(expiry: string): Date {
  return new Date(`${expiry}T20:00:00Z`);
}

export function yearsBetween(from: Date, to: Date): number {
  return Math.max(MIN_T, (to.getTime() - from.getTime()) / YEAR_MS);
}

export function contractIv(c: OptionContract, spot: number, t: number): number | null {
  const quoted = c.iv ?? c.impliedVolatility;
  if (quoted && quoted > 0.01 && quoted < 6) return quoted;
  return solveIv(c.type, spot, c.strike, t, c.mid);
}

/** Bisection on Black–Scholes. Null when the price is below intrinsic or unusable. */
export function solveIv(type: "call" | "put", spot: number, strike: number, t: number, price: number): number | null {
  if (!(price > 0) || !(spot > 0) || !(t > 0)) return null;
  let lo = 0.01;
  let hi = 6;
  if (bsPrice(type, spot, strike, t, lo) > price || bsPrice(type, spot, strike, t, hi) < price) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bsPrice(type, spot, strike, t, mid) > price) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function liquid(chain: OptionContract[]): OptionContract[] {
  return chain.filter((c) => c.bid > 0 && c.ask > 0 && c.ask >= c.bid);
}

export function nearest(chain: OptionContract[], type: "call" | "put", target: number): OptionContract | null {
  let best: OptionContract | null = null;
  for (const c of chain) {
    if (c.type !== type) continue;
    if (!best || Math.abs(c.strike - target) < Math.abs(best.strike - target)) best = c;
  }
  return best;
}

export interface Straddle {
  strike: number;
  call: OptionContract;
  put: OptionContract;
  /** Call + put mid, per share. */
  cost: number;
  /** Cost as a fraction of spot — the move the market is pricing. */
  movePct: number;
}

export function atmStraddle(chain: OptionContract[], spot: number): Straddle | null {
  const calls = new Map(chain.filter((c) => c.type === "call").map((c) => [c.strike, c]));
  const puts = new Map(chain.filter((c) => c.type === "put").map((c) => [c.strike, c]));
  const strikes = [...calls.keys()].filter((k) => puts.has(k)).sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot));
  const k = strikes[0];
  if (k == null) return null;
  const call = calls.get(k)!;
  const put = puts.get(k)!;
  const cost = call.mid + put.mid;
  return { strike: k, call, put, cost, movePct: (cost / spot) * 100 };
}

export interface VolSplit {
  frontIv: number;
  backIv: number | null;
  /** Ordinary vol left once the report is out. */
  baseIv: number;
  /** One-standard-deviation event move priced into the front expiry, % of spot. */
  eventMovePct: number;
  /** Multiplier applied to every leg's IV at exit. */
  crushRatio: number;
  method: "term-structure" | "realized-vol" | "none";
}

export function splitVol(args: {
  frontIv: number;
  backIv: number | null;
  tFront: number;
  tBack: number | null;
  realizedVol: number | null;
}): VolSplit {
  const { frontIv, backIv, tFront, tBack, realizedVol } = args;
  let baseIv: number | null = null;
  let method: VolSplit["method"] = "none";
  if (backIv != null && tBack != null && tBack > tFront) {
    const base2 = (backIv ** 2 * tBack - frontIv ** 2 * tFront) / (tBack - tFront);
    if (base2 > 0 && Math.sqrt(base2) < frontIv) {
      baseIv = Math.sqrt(base2);
      method = "term-structure";
    }
  }
  if (baseIv == null && realizedVol != null && realizedVol > 0) {
    baseIv = Math.min(frontIv, Math.max(0.15, realizedVol * 1.1));
    method = "realized-vol";
  }
  if (baseIv == null) baseIv = frontIv;
  const event2 = Math.max(0, (frontIv ** 2 - baseIv ** 2) * tFront);
  return {
    frontIv,
    backIv,
    baseIv,
    eventMovePct: Math.sqrt(event2) * 100,
    crushRatio: Math.min(1, Math.max(0.25, baseIv / frontIv)),
    method,
  };
}

export interface Leg {
  action: "buy" | "sell";
  type: "call" | "put";
  strike: number;
  expiry: string;
  qty: number;
  bid: number;
  ask: number;
  mid: number;
  /** Assumed entry fill, per share. */
  fill: number;
  iv: number;
  delta: number | null;
  openInterest: number;
  volume: number;
}

export function makeLeg(action: "buy" | "sell", c: OptionContract, iv: number): Leg {
  const slip = SLIPPAGE * (c.ask - c.bid);
  return {
    action, type: c.type, strike: c.strike, expiry: c.expiry, qty: 1,
    bid: c.bid, ask: c.ask, mid: c.mid,
    fill: action === "buy" ? c.mid + slip : Math.max(0.01, c.mid - slip),
    iv, delta: c.delta ?? null, openInterest: c.openInterest, volume: c.volume,
  };
}

export interface ExitModel {
  spot: number;
  /** Years from the exit to expiry. */
  tExit: number;
  crushRatio: number;
}

/** Signed per-share premium: positive = debit paid, negative = credit received. */
export function netPremium(legs: Leg[]): number {
  return legs.reduce((s, l) => s + (l.action === "buy" ? l.fill : -l.fill) * l.qty, 0);
}

function commissions(legs: Leg[], roundTrip: boolean): number {
  return legs.reduce((s, l) => s + l.qty, 0) * COMMISSION * (roundTrip ? 2 : 1);
}

/** Dollar P&L of the whole structure if closed at the exit with the stock `movePct` away from today. */
export function pnlAtExit(legs: Leg[], m: ExitModel, movePct: number): number {
  const s = m.spot * (1 + movePct / 100);
  let pnl = 0;
  for (const l of legs) {
    const model = bsPrice(l.type, s, l.strike, m.tExit, l.iv * m.crushRatio);
    const slip = SLIPPAGE * (l.ask - l.bid);
    const exit = l.action === "buy" ? Math.max(0, model - slip) : model + slip;
    pnl += (l.action === "buy" ? exit - l.fill : l.fill - exit) * 100 * l.qty;
  }
  return pnl - commissions(legs, true);
}

/** Held to expiry instead: the structure's theoretical best and worst. `maxGain` null = unlimited. */
export function expiryExtremes(legs: Leg[], spot: number): { maxGain: number | null; maxLoss: number } {
  const premium = netPremium(legs) * 100 + commissions(legs, false);
  const payoff = (s: number) =>
    legs.reduce((sum, l) => {
      const intrinsic = l.type === "call" ? Math.max(0, s - l.strike) : Math.max(0, l.strike - s);
      return sum + (l.action === "buy" ? intrinsic : -intrinsic) * 100 * l.qty;
    }, 0) - premium;
  const points = [0, ...legs.map((l) => l.strike), spot * 4];
  const values = points.map(payoff);
  const netLongCalls = legs.filter((l) => l.type === "call").reduce((s, l) => s + (l.action === "buy" ? l.qty : -l.qty), 0);
  return {
    maxGain: netLongCalls > 0 ? null : Math.max(...values),
    maxLoss: Math.max(0, -Math.min(...values)),
  };
}

export interface Range {
  min: number;
  max: number;
  avg: number;
}

function rangeOf(legs: Leg[], m: ExitModel, from: number, to: number): Range {
  const vals: number[] = [];
  for (let x = from; x <= to + 1e-9; x += 0.25) vals.push(pnlAtExit(legs, m, x));
  return { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length };
}

export interface Evaluation {
  scenarios: Array<{ movePct: number; price: number; pnl: number }>;
  curve: Array<{ movePct: number; pnl: number }>;
  /** The user's case: a 5–10% move either way, closed the session after. */
  band: { up: Range; down: Range; flat: Range; maxGain: number; maxLoss: number };
  breakevens: number[];
}

export function evaluate(legs: Leg[], m: ExitModel): Evaluation {
  const scenarios = SCENARIO_MOVES.map((x) => ({ movePct: x, price: m.spot * (1 + x / 100), pnl: pnlAtExit(legs, m, x) }));
  const curve: Evaluation["curve"] = [];
  for (let x = -15; x <= 15 + 1e-9; x += 0.5) curve.push({ movePct: x, pnl: pnlAtExit(legs, m, x) });
  const up = rangeOf(legs, m, 5, 10);
  const down = rangeOf(legs, m, -10, -5);
  const flat = rangeOf(legs, m, -2, 2);

  const breakevens: number[] = [];
  let prev = pnlAtExit(legs, m, -30);
  for (let x = -29.9; x <= 30 + 1e-9; x += 0.1) {
    const cur = pnlAtExit(legs, m, x);
    if ((prev < 0 && cur >= 0) || (prev >= 0 && cur < 0)) {
      const frac = prev / (prev - cur);
      breakevens.push(m.spot * (1 + (x - 0.1 + 0.1 * frac) / 100));
    }
    prev = cur;
  }
  return {
    scenarios, curve, breakevens,
    band: { up, down, flat, maxGain: Math.max(up.max, down.max), maxLoss: Math.min(up.min, down.min) },
  };
}
