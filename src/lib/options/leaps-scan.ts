/**
 * The daily LEAPS + PMCC scan.
 *
 * One pass over the two scanner universes. Per symbol it pulls the quote,
 * the one LEAPS expiry `pickLeapsExpiry` chooses, and the 20–60 DTE
 * expiries the PMCC short leg needs — not every chain the symbol lists,
 * which is what keeps ~110 tickers inside the function's five minutes.
 * Nothing here calls an LLM; the "why" lines come from the factor scores.
 */

import type { OptionContract, QuoteData } from "@/lib/market/types";
import { getAllOptionsChains, getQuotes } from "@/lib/market/yahoo";
import { tradierGetExpirations, tradierGetOptionsChain } from "@/lib/market/tradier";
import { SCAN_UNIVERSE } from "@/lib/analysis/movers";
import { DEFAULT_UNIVERSE } from "./csp-scanner";
import { findPMCCSetups } from "./pmcc";
import {
  daysBetween,
  pickLeapsExpiry,
  recommendStrikes,
  scoreLeaps,
  type LeapsFactor,
  type LeapsStrikePick,
} from "./leaps-grid";
import { buildPmccIncomePick, type PmccIncomePick } from "./pmcc-income";

export interface LeapsPick {
  symbol: string;
  name: string;
  spot: number;
  changePct: number;
  expiry: string;
  dte: number;
  recommended: LeapsStrikePick;
  itm: LeapsStrikePick | null;
  otm: LeapsStrikePick | null;
  score: number;
  factors: LeapsFactor[];
  why: string;
}

export interface LeapsScanResult {
  leaps: LeapsPick[];
  pmcc: PmccIncomePick[];
  universeSize: number;
  errors: string[];
  scannedAt: string;
}

export const LEAPS_KEEP = 25;
export const PMCC_KEEP = 30;
export const PMCC_PER_TICKER = 2;

const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 500;

export function scanUniverse(): string[] {
  return [...new Set([...DEFAULT_UNIVERSE, ...SCAN_UNIVERSE])];
}

function hasTradierToken(): boolean {
  return !!process.env.TRADIER_API_TOKEN;
}

interface SymbolChain {
  leapsExpiry: string | null;
  calls: OptionContract[];
}

/**
 * The calls this scan needs for one symbol. With Tradier that is the LEAPS
 * expiry plus the short-call window; the mock provider hands back its whole
 * relevant set in one call.
 */
async function fetchCalls(symbol: string, now: Date): Promise<SymbolChain> {
  if (!hasTradierToken()) {
    const chain = await getAllOptionsChains(symbol);
    if (!chain) return { leapsExpiry: null, calls: [] };
    return { leapsExpiry: pickLeapsExpiry(chain.expirations, now), calls: chain.calls };
  }

  const expirations = await tradierGetExpirations(symbol);
  const leapsExpiry = pickLeapsExpiry(expirations, now);
  const shortExpiries = expirations.filter((exp) => {
    const dte = daysBetween(now, new Date(`${exp}T21:00:00Z`));
    return dte >= 20 && dte <= 60;
  });
  const wanted = [...new Set([leapsExpiry, ...shortExpiries].filter((e): e is string => !!e))];
  const chains = await Promise.allSettled(wanted.map((exp) => tradierGetOptionsChain(symbol, exp)));
  const calls: OptionContract[] = [];
  for (const c of chains) {
    if (c.status === "fulfilled") calls.push(...c.value.calls);
  }
  return { leapsExpiry, calls };
}

function buildLeapsPick(quote: QuoteData, expiry: string, calls: OptionContract[]): LeapsPick | null {
  const rec = recommendStrikes(quote.price, calls);
  if (!rec.recommended) return null;
  const contract = calls.find(
    (c) => c.strike === rec.recommended!.strike && c.expiry === rec.recommended!.expiry
  );
  if (!contract) return null;
  const { score, factors, why } = scoreLeaps({ quote, contract });
  return {
    symbol: quote.symbol,
    name: quote.name,
    spot: quote.price,
    changePct: quote.changePct,
    expiry,
    dte: rec.recommended.dte,
    recommended: rec.recommended,
    itm: rec.itm,
    otm: rec.otm,
    score,
    factors,
    why,
  };
}

async function scanSymbol(
  quote: QuoteData,
  now: Date
): Promise<{ leaps: LeapsPick | null; pmcc: PmccIncomePick[] }> {
  const { leapsExpiry, calls } = await fetchCalls(quote.symbol, now);
  let leaps: LeapsPick | null = null;
  if (leapsExpiry) {
    const leapsCalls = calls.filter((c) => c.expiry === leapsExpiry);
    leaps = buildLeapsPick(quote, leapsExpiry, leapsCalls);
  }
  // One row per strike pair: the same 105/120 at two short expiries reads as
  // a duplicate in the income table, so the better-scoring one wins.
  const byPair = new Map<string, PmccIncomePick>();
  for (const c of findPMCCSetups(quote.symbol, quote.price, calls)) {
    const pick = buildPmccIncomePick(c, quote.name);
    const key = `${pick.leaps.strike}/${pick.shortCall.strike}`;
    const prev = byPair.get(key);
    if (!prev || pick.pmccScore > prev.pmccScore) byPair.set(key, pick);
  }
  const pmcc = [...byPair.values()]
    .sort((a, b) => b.pmccScore - a.pmccScore)
    .slice(0, PMCC_PER_TICKER);
  return { leaps, pmcc };
}

export interface ScanOptions {
  tickers?: string[];
  now?: Date;
  onProgress?: (done: number, total: number) => Promise<void> | void;
}

export async function runLeapsPmccScan(opts: ScanOptions = {}): Promise<LeapsScanResult> {
  const now = opts.now ?? new Date();
  const tickers = opts.tickers ?? scanUniverse();
  const errors: string[] = [];
  const leaps: LeapsPick[] = [];
  const pmcc: PmccIncomePick[] = [];

  let quotes: QuoteData[] = [];
  try {
    quotes = await getQuotes(tickers);
  } catch (e) {
    errors.push(`quotes: ${e instanceof Error ? e.message : String(e)}`);
  }
  const live = quotes.filter((q) => q.price > 0);

  for (let i = 0; i < live.length; i += BATCH_SIZE) {
    const batch = live.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map((q) => scanSymbol(q, now)));
    settled.forEach((result, j) => {
      if (result.status === "fulfilled") {
        if (result.value.leaps) leaps.push(result.value.leaps);
        pmcc.push(...result.value.pmcc);
      } else {
        errors.push(`${batch[j].symbol}: ${String(result.reason)}`);
      }
    });
    await opts.onProgress?.(Math.min(i + BATCH_SIZE, live.length), live.length);
    if (i + BATCH_SIZE < live.length) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
    }
  }

  leaps.sort((a, b) => b.score - a.score);
  pmcc.sort((a, b) => b.pmccScore - a.pmccScore || b.monthlyIncomePerSpread - a.monthlyIncomePerSpread);

  return {
    leaps: leaps.slice(0, LEAPS_KEEP),
    pmcc: pmcc.slice(0, PMCC_KEEP),
    universeSize: tickers.length,
    errors,
    scannedAt: now.toISOString(),
  };
}
