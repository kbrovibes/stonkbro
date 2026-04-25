import { OptionContract } from "@/lib/market/yahoo";

export type PMCCCandidate = {
  symbol: string;
  stockPrice: number;
  leaps: OptionContract;
  shortCall: OptionContract;
  netDebit: number;
  maxRisk: number;
  monthlyPremium: number;
  monthlyReturnPct: number;
  annualizedReturn: number;
  breakeven: number;
  leapsDelta: number;
  shortDelta: number;
  capitalRequired: number;
  capitalVs100Shares: number; // how much cheaper than owning 100 shares
  grade: "A" | "B" | "C";
  signals: string[];
};

/**
 * Find the best PMCC setups for a given stock.
 *
 * PMCC = Buy deep ITM LEAPS call, sell short-term OTM calls against it.
 *
 * LEAPS criteria:
 * - 180+ DTE (ideally 300+)
 * - Deep ITM (estimated delta > 0.65 based on moneyness)
 * - Liquid (open interest > 100)
 *
 * Short call criteria:
 * - 20-60 DTE
 * - OTM (strike > current price)
 * - Estimated delta 0.15-0.35
 * - Decent premium (> $0.50)
 */
export function findPMCCSetups(
  symbol: string,
  stockPrice: number,
  calls: OptionContract[]
): PMCCCandidate[] {
  // Separate LEAPS and short-term calls
  const leapsCandidates = calls.filter((c) =>
    c.dte >= 180 &&
    c.strike < stockPrice && // ITM
    c.mid > 0 &&
    c.openInterest >= 50 &&
    (c.bid > 0 || c.lastPrice > 0)
  );

  const shortCandidates = calls.filter((c) =>
    c.dte >= 20 &&
    c.dte <= 60 &&
    c.strike > stockPrice && // OTM
    c.mid > 0.5 &&
    c.openInterest >= 50
  );

  if (leapsCandidates.length === 0 || shortCandidates.length === 0) {
    return [];
  }

  // Use real delta from Greeks if available, otherwise estimate from moneyness
  function getDelta(contract: OptionContract, price: number): number {
    // Prefer real Greeks from Tradier
    if (contract.delta !== undefined && contract.delta !== null) {
      return Math.abs(contract.delta);
    }
    // Fallback: estimate from moneyness
    const moneyness = price / contract.strike;
    const timeAdjust = Math.sqrt(contract.dte / 365);
    if (contract.type === "call") {
      if (moneyness > 1.2) return Math.min(0.95, 0.5 + (moneyness - 1) * 1.5 / timeAdjust);
      if (moneyness > 1) return 0.5 + (moneyness - 1) * 2.5;
      if (moneyness > 0.8) return 0.5 - (1 - moneyness) * 2.5;
      return Math.max(0.05, 0.5 - (1 - moneyness) * 3);
    }
    return 0;
  }

  const setups: PMCCCandidate[] = [];

  // Find best LEAPS (delta 0.65-0.85)
  const bestLeaps = leapsCandidates
    .map((l) => ({ ...l, estDelta: getDelta(l, stockPrice) }))
    .filter((l) => l.estDelta >= 0.60 && l.estDelta <= 0.90)
    .sort((a, b) => {
      // Prefer delta around 0.75 and longer DTE
      const aScore = Math.abs(a.estDelta - 0.75) * 10 - a.dte / 100;
      const bScore = Math.abs(b.estDelta - 0.75) * 10 - b.dte / 100;
      return aScore - bScore;
    })
    .slice(0, 3); // top 3 LEAPS

  // Find best short calls (delta 0.15-0.35)
  const bestShorts = shortCandidates
    .map((s) => ({ ...s, estDelta: getDelta(s, stockPrice) }))
    .filter((s) => s.estDelta >= 0.10 && s.estDelta <= 0.40)
    .sort((a, b) => {
      // Prefer delta around 0.25 and 30-45 DTE
      const aScore = Math.abs(a.estDelta - 0.25) * 10 + Math.abs(a.dte - 37) / 10;
      const bScore = Math.abs(b.estDelta - 0.25) * 10 + Math.abs(b.dte - 37) / 10;
      return aScore - bScore;
    })
    .slice(0, 3); // top 3 short calls

  for (const leaps of bestLeaps) {
    for (const short of bestShorts) {
      // PMCC requires short strike > LEAPS strike
      if (short.strike <= leaps.strike) continue;

      const leapsPrice = leaps.mid > 0 ? leaps.mid : leaps.lastPrice;
      const shortPrice = short.mid > 0 ? short.mid : short.lastPrice;

      if (leapsPrice <= 0 || shortPrice <= 0) continue;

      const netDebit = leapsPrice - shortPrice;
      const maxRisk = netDebit * 100; // per contract
      const monthlyPremium = shortPrice * 100;
      const monthlyReturnPct = (shortPrice / leapsPrice) * 100;
      const annualized = monthlyReturnPct * 12;
      const breakeven = leaps.strike + netDebit;
      const capitalRequired = leapsPrice * 100;
      const sharesEquiv = stockPrice * 100;
      const capitalSavings = ((sharesEquiv - capitalRequired) / sharesEquiv) * 100;

      const signals: string[] = [];
      if (leaps.estDelta >= 0.70) signals.push(`LEAPS delta ~${leaps.estDelta.toFixed(2)}`);
      if (leaps.dte >= 300) signals.push(`${leaps.dte} DTE on LEAPS`);
      if (monthlyReturnPct >= 3) signals.push(`${monthlyReturnPct.toFixed(1)}% monthly yield`);
      if (capitalSavings >= 50) signals.push(`${capitalSavings.toFixed(0)}% less capital than shares`);
      if (short.openInterest >= 500) signals.push("High short call liquidity");

      let grade: "A" | "B" | "C" = "C";
      if (leaps.estDelta >= 0.70 && monthlyReturnPct >= 2.5 && capitalSavings >= 40) grade = "A";
      else if (leaps.estDelta >= 0.65 && monthlyReturnPct >= 1.5) grade = "B";

      setups.push({
        symbol,
        stockPrice,
        leaps: { ...leaps },
        shortCall: { ...short },
        netDebit,
        maxRisk,
        monthlyPremium,
        monthlyReturnPct,
        annualizedReturn: annualized,
        breakeven,
        leapsDelta: leaps.estDelta,
        shortDelta: short.estDelta,
        capitalRequired,
        capitalVs100Shares: capitalSavings,
        grade,
        signals,
      });
    }
  }

  // Sort by grade then monthly return
  return setups.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
    return b.monthlyReturnPct - a.monthlyReturnPct;
  });
}
