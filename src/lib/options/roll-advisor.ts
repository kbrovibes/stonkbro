/**
 * Smart Roll Advisor — multi-factor roll detection for option positions.
 *
 * Evaluates each short option leg against multiple roll triggers and produces
 * a unified recommendation with urgency scoring. Factors:
 *
 * 1. DTE urgency (< 7 critical, < 14 high, < 21 medium)
 * 2. Profit capture (> 50% of max premium collected)
 * 3. Strike proximity / breach (delta drift proxy)
 * 4. Earnings proximity (close/roll before catalyst)
 *
 * Each factor contributes to a 0-100 roll urgency score.
 */

import type { QuoteData } from "@/lib/market/types";
import type { TrackedPosition } from "./signals";
import type { AlertItem } from "@/lib/notifications/email";

export type RollReason = "dte" | "profit" | "strike_breach" | "earnings" | "combined";

export type RollRecommendation = {
  symbol: string;
  strategy: string;
  legType: string;
  strike: number;
  expiry: string;
  dte: number;
  rollScore: number;       // 0-100 composite urgency
  reasons: RollReason[];
  action: string;          // human-readable recommendation
  details: string;         // supporting data
};

// ---------------------------------------------------------------------------
// Factor scoring (each returns 0-30, capped at 100 total)
// ---------------------------------------------------------------------------

function scoreDTE(dte: number): number {
  if (dte <= 0) return 30;
  if (dte <= 3) return 28;
  if (dte <= 7) return 25;
  if (dte <= 14) return 18;
  if (dte <= 21) return 12;
  if (dte <= 30) return 5;
  return 0;
}

function scoreProfit(entryPrice: number, currentPrice: number | undefined): number {
  if (currentPrice === undefined || entryPrice <= 0) return 0;
  const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;
  if (profitPct >= 80) return 30;
  if (profitPct >= 65) return 25;
  if (profitPct >= 50) return 20;
  if (profitPct >= 30) return 10;
  return 0;
}

function scoreStrikeProximity(
  legType: string,
  strike: number,
  stockPrice: number
): number {
  if (legType === "short_call") {
    // How close is stock to short call strike (or above it)?
    const pctFromStrike = ((stockPrice - strike) / strike) * 100;
    if (pctFromStrike >= 3) return 30;    // breached by 3%+
    if (pctFromStrike >= 0) return 25;    // at or above strike
    if (pctFromStrike >= -2) return 18;   // within 2% below
    if (pctFromStrike >= -5) return 10;   // within 5% below
    return 0;
  }

  if (legType === "short_put") {
    // How close is stock to short put strike (or below it)?
    const pctFromStrike = ((strike - stockPrice) / strike) * 100;
    if (pctFromStrike >= 3) return 30;    // below strike by 3%+
    if (pctFromStrike >= 0) return 25;    // at or below strike
    if (pctFromStrike >= -2) return 18;   // within 2% above
    if (pctFromStrike >= -5) return 10;   // within 5% above
    return 0;
  }

  return 0;
}

function scoreEarningsProximity(
  earningsDate: string | null,
  now: Date
): number {
  if (!earningsDate) return 0;
  const earnings = new Date(earningsDate);
  const daysUntil = Math.ceil((earnings.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 0;     // already passed
  if (daysUntil <= 2) return 30;    // imminent
  if (daysUntil <= 5) return 22;    // this week
  if (daysUntil <= 10) return 12;   // next week-ish
  return 0;
}

// ---------------------------------------------------------------------------
// Roll direction recommendation
// ---------------------------------------------------------------------------

function rollDirection(
  legType: string,
  strike: number,
  stockPrice: number,
  dte: number
): string {
  if (legType === "short_call") {
    if (stockPrice >= strike) {
      return `Roll up and out — move strike above $${(stockPrice * 1.03).toFixed(0)} with 30-45 DTE`;
    }
    if (dte <= 7) {
      return `Roll out — same $${strike} strike, next monthly expiration`;
    }
    return `Roll to 30-45 DTE at $${strike} or higher strike`;
  }

  if (legType === "short_put") {
    if (stockPrice <= strike) {
      return `Roll down and out — move strike below $${(stockPrice * 0.97).toFixed(0)} with 30-45 DTE`;
    }
    if (dte <= 7) {
      return `Roll out — same $${strike} strike, next monthly expiration`;
    }
    return `Roll to 30-45 DTE at $${strike} or lower strike`;
  }

  return "Consider rolling to extend DTE";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function analyzeRollOpportunities(
  positions: TrackedPosition[],
  quotes: Map<string, QuoteData>
): RollRecommendation[] {
  const recommendations: RollRecommendation[] = [];
  const now = new Date();

  for (const pos of positions) {
    const quote = quotes.get(pos.symbol);
    if (!quote) continue;

    for (const leg of pos.legs) {
      // Only analyze short options
      if (leg.type !== "short_call" && leg.type !== "short_put") continue;

      const expiryDate = new Date(leg.expiry);
      const dte = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Score each factor
      const dteScore = scoreDTE(dte);
      const profitScore = scoreProfit(leg.entryPrice, leg.currentPrice);
      const strikeScore = scoreStrikeProximity(leg.type, leg.strike, quote.price);
      const earningsScore = scoreEarningsProximity(quote.earningsDate, now);

      const rollScore = Math.min(100, dteScore + profitScore + strikeScore + earningsScore);

      // Only recommend if score is meaningful (>= 20)
      if (rollScore < 20) continue;

      const reasons: RollReason[] = [];
      if (dteScore >= 12) reasons.push("dte");
      if (profitScore >= 20) reasons.push("profit");
      if (strikeScore >= 18) reasons.push("strike_breach");
      if (earningsScore >= 12) reasons.push("earnings");
      if (reasons.length >= 2) reasons.push("combined");

      const action = rollDirection(leg.type, leg.strike, quote.price, dte);

      const detailParts: string[] = [];
      if (dteScore > 0) detailParts.push(`${dte} DTE`);
      if (profitScore > 0 && leg.currentPrice !== undefined) {
        const pct = ((leg.entryPrice - leg.currentPrice) / leg.entryPrice * 100).toFixed(0);
        detailParts.push(`${pct}% profit`);
      }
      if (strikeScore > 0) {
        const diff = ((quote.price - leg.strike) / leg.strike * 100).toFixed(1);
        detailParts.push(`stock ${parseFloat(diff) >= 0 ? "+" : ""}${diff}% from strike`);
      }
      if (earningsScore > 0 && quote.earningsDate) {
        const daysToEarnings = Math.ceil((new Date(quote.earningsDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        detailParts.push(`earnings in ${daysToEarnings}d`);
      }

      recommendations.push({
        symbol: pos.symbol,
        strategy: pos.strategy,
        legType: leg.type,
        strike: leg.strike,
        expiry: leg.expiry,
        dte,
        rollScore,
        reasons,
        action,
        details: detailParts.join(" · "),
      });
    }
  }

  return recommendations.sort((a, b) => b.rollScore - a.rollScore);
}

/**
 * Convert roll recommendations into AlertItems for the signals pipeline.
 */
export function rollRecommendationsToAlerts(recs: RollRecommendation[]): AlertItem[] {
  return recs.map((rec) => {
    const urgency: "high" | "medium" | "low" =
      rec.rollScore >= 60 ? "high" : rec.rollScore >= 35 ? "medium" : "low";

    const legLabel = rec.legType === "short_call" ? "short call" : "short put";
    const reasonLabels: Record<RollReason, string> = {
      dte: "low DTE",
      profit: "profit target",
      strike_breach: "strike proximity",
      earnings: "earnings",
      combined: "",
    };
    const reasonText = rec.reasons
      .filter((r) => r !== "combined")
      .map((r) => reasonLabels[r])
      .join(" + ");

    return {
      action: rec.rollScore >= 50 ? "ROLL" as const : "WARNING" as const,
      symbol: rec.symbol,
      strategy: rec.strategy,
      message: `Smart Roll: $${rec.strike} ${legLabel} — ${reasonText} (score: ${rec.rollScore})`,
      urgency,
      details: `${rec.action}\n${rec.details}`,
    };
  });
}
