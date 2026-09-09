/**
 * PMCC Income math. Pure.
 *
 * Two layers, because the daily scan does not know your budget:
 *
 * 1. `buildPmccIncomePick` — everything about one setup that is true for
 *    any budget: per-spread debit, credit, breakeven, width, max profit,
 *    monthly income per spread, annualized ROC, and the score. This is what
 *    the scan persists.
 * 2. `applyBudget` / `rankForBudget` — how many spreads fit, what that
 *    deploys, and what it pays. Runs on the client so a budget change
 *    re-ranks with no network call.
 */

import type { PMCCCandidate } from "./pmcc";
import { contractIv } from "./leaps-grid";

export const DEFAULT_PMCC_BUDGET = 20_000;

export interface PmccLeg {
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  iv: number;
  delta: number;
  openInterest: number;
}

export type PmccFactorKey = "aroc" | "delta" | "liquidity" | "dte";

export interface PmccFactor {
  key: PmccFactorKey;
  label: string;
  score: number;
  weight: number;
}

export interface PmccIncomePick {
  symbol: string;
  name: string;
  stockPrice: number;
  leaps: PmccLeg;
  shortCall: PmccLeg;
  /** (leapsMid − shortMid) × 100. */
  netDebitPerSpread: number;
  /** shortMid × 100. */
  creditPerSpread: number;
  /** credit × 30 / shortDte. */
  monthlyIncomePerSpread: number;
  /** monthly × 12 / netDebit, in percent. */
  arocPct: number;
  breakeven: number;
  spreadWidth: number;
  /** (width − netDebit) × 100, floored at 0. */
  maxProfitAtShortExpiry: number;
  pmccScore: number;
  factors: PmccFactor[];
  why: string;
}

export interface PmccIncomeSetup extends PmccIncomePick {
  budget: number;
  spreads: number;
  deployed: number;
  monthlyIncome: number;
  annualIncome: number;
  affordable: boolean;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function logScale(n: number, full: number): number {
  if (!(n > 0)) return 0;
  return clamp((Math.log10(n + 1) / Math.log10(full + 1)) * 100);
}

const FACTOR_META: Record<PmccFactorKey, { label: string; weight: number }> = {
  aroc: { label: "Annualized ROC", weight: 50 },
  delta: { label: "LEAPS delta ≈ 0.75", weight: 20 },
  liquidity: { label: "Liquidity", weight: 20 },
  dte: { label: "Short DTE 21–50", weight: 10 },
};

function toLeg(c: PMCCCandidate["leaps"], delta: number): PmccLeg {
  return {
    strike: c.strike,
    expiry: c.expiry,
    dte: c.dte,
    bid: c.bid,
    ask: c.ask,
    mid: c.mid > 0 ? c.mid : c.lastPrice,
    iv: contractIv(c),
    delta,
    openInterest: c.openInterest,
  };
}

function dteScore(dte: number): number {
  if (dte >= 21 && dte <= 50) return 100;
  const dist = dte < 21 ? 21 - dte : dte - 50;
  return Math.round(clamp(100 - dist * 5));
}

export function buildPmccIncomePick(c: PMCCCandidate, name?: string): PmccIncomePick {
  const leaps = toLeg(c.leaps, c.leapsDelta);
  const shortCall = toLeg(c.shortCall, c.shortDelta);

  const netDebitPerSpread = (leaps.mid - shortCall.mid) * 100;
  const creditPerSpread = shortCall.mid * 100;
  const monthlyIncomePerSpread = shortCall.dte > 0 ? creditPerSpread * (30 / shortCall.dte) : 0;
  const arocPct = netDebitPerSpread > 0 ? ((monthlyIncomePerSpread * 12) / netDebitPerSpread) * 100 : 0;
  const breakeven = leaps.strike + netDebitPerSpread / 100;
  const spreadWidth = shortCall.strike - leaps.strike;
  const maxProfitAtShortExpiry = Math.max(0, spreadWidth * 100 - netDebitPerSpread);

  const raw: Record<PmccFactorKey, number> = {
    aroc: Math.round(clamp((arocPct / 80) * 100)),
    delta: Math.round(clamp(100 - (Math.abs(leaps.delta - 0.75) / 0.2) * 100)),
    liquidity: Math.round(
      logScale(Math.min(leaps.openInterest, shortCall.openInterest), 3000) * 0.6 +
        logScale(Math.max(leaps.openInterest, shortCall.openInterest), 3000) * 0.4
    ),
    dte: dteScore(shortCall.dte),
  };
  const factors: PmccFactor[] = (Object.keys(FACTOR_META) as PmccFactorKey[]).map((key) => ({
    key,
    label: FACTOR_META[key].label,
    score: raw[key],
    weight: FACTOR_META[key].weight,
  }));
  const pmccScore = Math.round(factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0));

  const why = buildWhy(c.symbol, { leaps, shortCall, arocPct, factors });

  return {
    symbol: c.symbol,
    name: name ?? c.symbol,
    stockPrice: c.stockPrice,
    leaps,
    shortCall,
    netDebitPerSpread,
    creditPerSpread,
    monthlyIncomePerSpread,
    arocPct,
    breakeven,
    spreadWidth,
    maxProfitAtShortExpiry,
    pmccScore,
    factors,
    why,
  };
}

function buildWhy(
  symbol: string,
  p: { leaps: PmccLeg; shortCall: PmccLeg; arocPct: number; factors: PmccFactor[] }
): string {
  const phrase: Record<PmccFactorKey, string> = {
    aroc: `a ${Math.round(p.arocPct)}% annualized return on the net debit`,
    delta: `a ${p.leaps.delta.toFixed(2)}Δ LEAPS that tracks the stock`,
    liquidity: `liquid legs (${Math.min(p.leaps.openInterest, p.shortCall.openInterest).toLocaleString("en-US")}+ OI each)`,
    dte: `a ${p.shortCall.dte} DTE short call in the income window`,
  };
  const ranked = [...p.factors].sort((a, b) => b.score - a.score);
  const weakest = ranked[ranked.length - 1];
  const caveat: Record<PmccFactorKey, string> = {
    aroc: "the yield is modest for the capital tied up",
    delta: `the ${p.leaps.delta.toFixed(2)}Δ LEAPS will lag the stock`,
    liquidity: "one leg trades thin",
    dte: `the ${p.shortCall.dte} DTE short call sits outside the 21–50 day window`,
  };
  let why = `${symbol} ranks on ${phrase[ranked[0].key]} and ${phrase[ranked[1].key]}`;
  why += weakest.score < 40 ? `; ${caveat[weakest.key]}.` : ".";
  return why;
}

/* -------------------------------------------------------------------------
   Budget
   ------------------------------------------------------------------------- */

export function applyBudget(pick: PmccIncomePick, budget: number): PmccIncomeSetup {
  const spreads =
    pick.netDebitPerSpread > 0 && budget > 0 ? Math.floor(budget / pick.netDebitPerSpread) : 0;
  const deployed = spreads * pick.netDebitPerSpread;
  const monthlyIncome = pick.monthlyIncomePerSpread * spreads;
  return {
    ...pick,
    budget,
    spreads,
    deployed,
    monthlyIncome,
    annualIncome: monthlyIncome * 12,
    affordable: spreads > 0,
  };
}

/** Score, then monthly income. Setups the budget cannot open sort last. */
export function rankForBudget(picks: PmccIncomePick[], budget: number): PmccIncomeSetup[] {
  return picks
    .map((p) => applyBudget(p, budget))
    .sort((a, b) => {
      if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
      if (b.pmccScore !== a.pmccScore) return b.pmccScore - a.pmccScore;
      return b.monthlyIncome - a.monthlyIncome;
    });
}

export type PmccSortKey = "score" | "monthly" | "aroc" | "debit";

export function sortSetups(setups: PmccIncomeSetup[], key: PmccSortKey): PmccIncomeSetup[] {
  const by: Record<PmccSortKey, (s: PmccIncomeSetup) => number> = {
    score: (s) => s.pmccScore,
    monthly: (s) => s.monthlyIncome,
    aroc: (s) => s.arocPct,
    debit: (s) => -s.netDebitPerSpread,
  };
  const f = by[key];
  return [...setups].sort((a, b) => {
    if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
    const d = f(b) - f(a);
    return d !== 0 ? d : b.pmccScore - a.pmccScore;
  });
}
