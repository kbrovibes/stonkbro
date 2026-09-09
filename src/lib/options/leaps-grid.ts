/**
 * LEAPS Lab math. Pure — no I/O, no dates read from the clock unless a caller
 * omits `now`.
 *
 * The grid answers one question: what is this call worth, at each quarter
 * between now and expiry, if the stock moves by X%? It is Black–Scholes with
 * the contract's own implied volatility held constant and r = 4%. That is a
 * model, not a forecast: it says nothing about IV crush, dividends, or early
 * exercise, and the UI says so.
 */

import type { OptionContract, QuoteData } from "@/lib/market/types";
import type { TechnicalSignals } from "@/lib/analysis/technicals";

export const RISK_FREE_RATE = 0.04;

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365.25;

export const GRID_MOVES = [-30, -20, -10, 0, 10, 20, 30, 50, 100] as const;

/* -------------------------------------------------------------------------
   Black–Scholes
   ------------------------------------------------------------------------- */

/** Abramowitz–Stegun 7.1.26 — max error 1.5e-7, plenty for a price grid. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-ax * ax));
}

export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * European call price. At T = 0 the value is intrinsic. With no volatility the
 * call is worth its discounted forward intrinsic — a degenerate input, handled
 * so the grid never prints NaN.
 */
export function bsCall(S: number, K: number, T: number, r: number, sigma: number): number {
  if (!(S > 0) || !(K > 0)) return 0;
  if (T <= 0) return Math.max(S - K, 0);
  if (!(sigma > 0)) return Math.max(S - K * Math.exp(-r * T), 0);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}

/* -------------------------------------------------------------------------
   Grid
   ------------------------------------------------------------------------- */

export interface GridColumn {
  label: string;
  /** Months from `now`. */
  months: number;
  /** Time left on the contract at that point, in years. 0 at expiry. */
  yearsToExpiryRemaining: number;
}

export interface GridCell {
  /** Modelled contract value per share. */
  value: number;
  /** Return vs the contract's mid, in percent. */
  returnPct: number;
}

export interface GridRow {
  movePct: number;
  /** The stock price that move implies. */
  price: number;
  cells: GridCell[];
}

export interface LeapsGrid {
  columns: GridColumn[];
  rows: GridRow[];
  /** Years from `now` to expiry. */
  yearsToExpiry: number;
}

export interface GridInput {
  spot: number;
  strike: number;
  /** ISO date `YYYY-MM-DD`. */
  expiry: string;
  mid: number;
  /** As a fraction: 0.81 for 81%. */
  iv: number;
  now?: Date;
  r?: number;
}

function parseExpiry(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T21:00:00Z`);
}

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

/**
 * Columns run every quarter from `now` to expiry, then `At expiry`. Past
 * seven quarters the step widens to six months so the grid never exceeds
 * eight columns — the alternative, dropping the far quarters, would leave
 * an unexplained gap before expiry.
 */
export function gridColumns(now: Date, expiry: Date): GridColumn[] {
  const totalDays = Math.max(0, daysBetween(now, expiry));
  const totalMonths = totalDays / (DAYS_PER_YEAR / 12);
  const quarterCount = Math.floor((totalMonths - 0.5) / 3);
  const step = quarterCount > 7 ? 6 : 3;
  const columns: GridColumn[] = [];
  for (let m = step; m < totalMonths - 0.5 && columns.length < 7; m += step) {
    const remainingDays = totalDays - m * (DAYS_PER_YEAR / 12);
    columns.push({
      label: `${m}m`,
      months: m,
      yearsToExpiryRemaining: Math.max(0, remainingDays / DAYS_PER_YEAR),
    });
  }
  columns.push({
    label: "At expiry",
    months: Math.round(totalMonths * 10) / 10,
    yearsToExpiryRemaining: 0,
  });
  return columns;
}

export function buildLeapsGrid(input: GridInput): LeapsGrid {
  const now = input.now ?? new Date();
  const r = input.r ?? RISK_FREE_RATE;
  const expiry = parseExpiry(input.expiry);
  const columns = gridColumns(now, expiry);
  const yearsToExpiry = Math.max(0, daysBetween(now, expiry) / DAYS_PER_YEAR);
  const mid = input.mid;

  const rows: GridRow[] = GRID_MOVES.map((movePct) => {
    const price = input.spot * (1 + movePct / 100);
    const cells = columns.map((col) => {
      const value = bsCall(price, input.strike, col.yearsToExpiryRemaining, r, input.iv);
      const returnPct = mid > 0 ? ((value - mid) / mid) * 100 : 0;
      return { value, returnPct };
    });
    return { movePct, price, cells };
  });

  return { columns, rows, yearsToExpiry };
}

/** One strike as `GET /api/leaps/grid` prices it. Unlisted or unquoted strikes say so. */
export type PricedStrike =
  | { strike: number; unavailable: true; reason: string }
  | {
      strike: number;
      unavailable: false;
      bid: number;
      ask: number;
      mid: number;
      iv: number;
      delta: number | null;
      openInterest: number;
      volume: number;
      dte: number;
      grid: LeapsGrid;
    };

export interface GridResponse {
  symbol: string;
  expiry: string;
  spot: number;
  chainAsOf: string;
  listedStrikes: number[];
  strikes: PricedStrike[];
}

/* -------------------------------------------------------------------------
   Scoring
   ------------------------------------------------------------------------- */

export type LeapsFactorKey = "liquidity" | "iv" | "momentum" | "range";

export interface LeapsFactor {
  key: LeapsFactorKey;
  label: string;
  /** 0–100. */
  score: number;
  /** Percent of the composite. */
  weight: number;
}

export interface LeapsScore {
  score: number;
  factors: LeapsFactor[];
  why: string;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** 0 at zero, 100 at `full`, on a log scale — open interest and volume. */
function logScale(n: number, full: number): number {
  if (!(n > 0)) return 0;
  return clamp((Math.log10(n + 1) / Math.log10(full + 1)) * 100);
}

function liquidityScore(c: OptionContract): number {
  const oi = logScale(c.openInterest, 5000);
  const vol = logScale(c.volume, 1000);
  const spreadPct = c.mid > 0 && c.ask >= c.bid ? ((c.ask - c.bid) / c.mid) * 100 : 100;
  const spread = clamp(100 - spreadPct * 5);
  return Math.round(oi * 0.5 + vol * 0.2 + spread * 0.3);
}

/** Best between 35% and 65%. Cheap enough to own, rich enough to move. */
function ivScore(iv: number): number {
  if (!(iv > 0)) return 0;
  if (iv < 0.35) return Math.round(clamp(60 + ((iv - 0.1) / 0.25) * 40, 60, 100));
  if (iv <= 0.65) return 100;
  if (iv <= 1.0) return Math.round(100 - ((iv - 0.65) / 0.35) * 60);
  return Math.round(clamp(40 - ((iv - 1.0) / 0.5) * 40));
}

function momentumScore(q: QuoteData, t?: TechnicalSignals | null): number {
  const above50 = t?.above50sma ?? q.above50sma;
  const above200 = t?.above200sma ?? q.above200sma;
  const change = t?.change20d ?? q.changePct;
  let score = (above50 ? 35 : 0) + (above200 ? 35 : 0);
  score += clamp(15 + change * 3, 0, 30);
  if (t?.goldenCross) score = Math.min(100, score + 5);
  return Math.round(clamp(score));
}

function rangeScore(q: QuoteData): number {
  const span = q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow;
  if (!(span > 0) || !(q.price > 0)) return 50;
  return Math.round(clamp(((q.price - q.fiftyTwoWeekLow) / span) * 100));
}

const FACTOR_META: Record<LeapsFactorKey, { label: string; weight: number }> = {
  liquidity: { label: "Liquidity", weight: 40 },
  iv: { label: "Moderate IV", weight: 25 },
  momentum: { label: "Momentum", weight: 25 },
  range: { label: "52-week proximity", weight: 10 },
};

function strengthPhrase(key: LeapsFactorKey, q: QuoteData, c: OptionContract): string {
  switch (key) {
    case "liquidity":
      return `a liquid contract (${c.openInterest.toLocaleString("en-US")} OI)`;
    case "iv":
      return `a moderate IV of ${Math.round(contractIv(c) * 100)}%`;
    case "momentum":
      return q.above50sma && q.above200sma
        ? "positive price momentum above both moving averages"
        : "positive price momentum";
    case "range":
      return "strength near its 52-week high";
  }
}

function weaknessPhrase(key: LeapsFactorKey, c: OptionContract): string {
  switch (key) {
    case "liquidity":
      return "the contract trades thin";
    case "iv":
      return contractIv(c) > 0.65
        ? `IV at ${Math.round(contractIv(c) * 100)}% makes the premium rich`
        : "IV is low enough that the option may lag a move";
    case "momentum":
      return "momentum is against it";
    case "range":
      return "it sits far below its 52-week high";
  }
}

export function contractIv(c: OptionContract): number {
  return c.iv ?? c.impliedVolatility ?? 0;
}

export function scoreLeaps(input: {
  quote: QuoteData;
  contract: OptionContract;
  technicals?: TechnicalSignals | null;
}): LeapsScore {
  const { quote, contract, technicals } = input;
  const raw: Record<LeapsFactorKey, number> = {
    liquidity: liquidityScore(contract),
    iv: ivScore(contractIv(contract)),
    momentum: momentumScore(quote, technicals),
    range: rangeScore(quote),
  };
  const factors: LeapsFactor[] = (Object.keys(FACTOR_META) as LeapsFactorKey[]).map((key) => ({
    key,
    label: FACTOR_META[key].label,
    score: raw[key],
    weight: FACTOR_META[key].weight,
  }));
  const score = Math.round(factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0));

  const ranked = [...factors].sort((a, b) => b.score - a.score);
  const [first, second] = ranked;
  const weakest = ranked[ranked.length - 1];
  let why = `${quote.symbol} stands out for ${strengthPhrase(first.key, quote, contract)} and ${strengthPhrase(second.key, quote, contract)}`;
  why += weakest.score < 40 ? `; ${weaknessPhrase(weakest.key, contract)}.` : ".";

  return { score, factors, why };
}

/* -------------------------------------------------------------------------
   Strike recommendation
   ------------------------------------------------------------------------- */

export interface LeapsStrikePick {
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  iv: number;
  delta: number | null;
  openInterest: number;
  volume: number;
}

export interface StrikeRecommendation {
  recommended: LeapsStrikePick | null;
  itm: LeapsStrikePick | null;
  otm: LeapsStrikePick | null;
}

export function toStrikePick(c: OptionContract): LeapsStrikePick {
  return {
    strike: c.strike,
    expiry: c.expiry,
    dte: c.dte,
    bid: c.bid,
    ask: c.ask,
    mid: c.mid,
    iv: contractIv(c),
    delta: typeof c.delta === "number" ? Math.abs(c.delta) : null,
    openInterest: c.openInterest,
    volume: c.volume,
  };
}

function nearest(
  calls: OptionContract[],
  target: number,
  key: (c: OptionContract) => number | null
): OptionContract | null {
  let best: OptionContract | null = null;
  let bestDist = Infinity;
  for (const c of calls) {
    const v = key(c);
    if (v == null) continue;
    const d = Math.abs(v - target);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

/**
 * From one expiry's calls: recommended ≈ 0.70Δ, ITM ≈ 0.80Δ, OTM ≈ 0.50Δ.
 * Without Greeks the fallback is by moneyness — 0.85×, 0.75×, 1.0× spot.
 */
export function recommendStrikes(spot: number, calls: OptionContract[]): StrikeRecommendation {
  const priced = calls.filter((c) => c.type === "call" && c.mid > 0 && c.strike > 0);
  const hasDelta = priced.some((c) => typeof c.delta === "number");
  const pick = (delta: number, moneyness: number): LeapsStrikePick | null => {
    const c = hasDelta
      ? nearest(priced, delta, (x) => (typeof x.delta === "number" ? Math.abs(x.delta) : null))
      : nearest(priced, spot * moneyness, (x) => x.strike);
    return c ? toStrikePick(c) : null;
  };
  return {
    recommended: pick(0.7, 0.85),
    itm: pick(0.8, 0.75),
    otm: pick(0.5, 1.0),
  };
}

/**
 * The LEAPS expiry: 365–730 DTE, closest to ~16 months. Falls back to the
 * nearest expiry past a year when nothing lands in the window.
 */
export function pickLeapsExpiry(expirations: string[], now: Date = new Date()): string | null {
  const withDte = expirations
    .map((exp) => ({ exp, dte: daysBetween(now, parseExpiry(exp)) }))
    .filter((e) => e.dte >= 365);
  if (withDte.length === 0) return null;
  const inWindow = withDte.filter((e) => e.dte <= 730);
  const pool = inWindow.length > 0 ? inWindow : withDte;
  const target = 16 * (DAYS_PER_YEAR / 12);
  pool.sort((a, b) => Math.abs(a.dte - target) - Math.abs(b.dte - target));
  return pool[0].exp;
}
