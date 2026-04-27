/**
 * Position Health Scores — per-position health metric.
 *
 * Evaluates each position across three dimensions:
 * 1. DTE urgency (time decay pressure)
 * 2. Strike risk (how close price is to short strike)
 * 3. Profit progress (premium captured vs entry)
 *
 * Returns a 0-100 health score and color-coded status.
 */

import type { QuoteData } from "@/lib/market/types";

export type HealthDimension = {
  label: string;
  score: number;     // 0-100 (100 = healthy)
  status: "good" | "caution" | "danger";
  detail: string;
};

export type PositionHealth = {
  symbol: string;
  strategy: string;
  overallScore: number;   // 0-100
  status: "healthy" | "watch" | "danger" | "critical";
  color: "emerald" | "amber" | "orange" | "red";
  dimensions: {
    dte: HealthDimension;
    strike: HealthDimension;
    profit: HealthDimension;
  };
};

type PositionLeg = {
  type: string;
  strike: number;
  expiry: string;
  entryPrice: number;
  currentPrice?: number;
};

type PositionInput = {
  symbol: string;
  strategy: string;
  legs: PositionLeg[];
};

// ---------------------------------------------------------------------------
// DTE Health (100 = plenty of time, 0 = expired)
// ---------------------------------------------------------------------------

function scoreDTE(legs: PositionLeg[]): HealthDimension {
  const now = new Date();
  const shortLegs = legs.filter((l) => l.type === "short_call" || l.type === "short_put");

  if (shortLegs.length === 0) {
    return { label: "Time Decay", score: 90, status: "good", detail: "No short options" };
  }

  // Use the closest-to-expiry short leg
  const minDTE = Math.min(...shortLegs.map((l) => {
    return Math.max(0, Math.ceil((new Date(l.expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }));

  let score: number;
  let status: "good" | "caution" | "danger";
  let detail: string;

  if (minDTE >= 30) {
    score = 100;
    status = "good";
    detail = `${minDTE} DTE — comfortable`;
  } else if (minDTE >= 21) {
    score = 80;
    status = "good";
    detail = `${minDTE} DTE — on track`;
  } else if (minDTE >= 14) {
    score = 60;
    status = "caution";
    detail = `${minDTE} DTE — monitor for roll`;
  } else if (minDTE >= 7) {
    score = 35;
    status = "caution";
    detail = `${minDTE} DTE — roll window`;
  } else if (minDTE >= 3) {
    score = 15;
    status = "danger";
    detail = `${minDTE} DTE — urgent roll needed`;
  } else {
    score = 0;
    status = "danger";
    detail = `${minDTE} DTE — expiring`;
  }

  return { label: "Time Decay", score, status, detail };
}

// ---------------------------------------------------------------------------
// Strike Risk (100 = safe distance, 0 = deep ITM)
// ---------------------------------------------------------------------------

function scoreStrike(legs: PositionLeg[], price: number): HealthDimension {
  const shortLegs = legs.filter((l) => l.type === "short_call" || l.type === "short_put");

  if (shortLegs.length === 0 || price <= 0) {
    return { label: "Strike Risk", score: 90, status: "good", detail: "No short strike exposure" };
  }

  // Find the most at-risk short leg
  let worstPct = Infinity;
  let worstLeg: PositionLeg | null = null;

  for (const leg of shortLegs) {
    const pct = leg.type === "short_call"
      ? ((leg.strike - price) / price) * 100      // positive = OTM
      : ((price - leg.strike) / price) * 100;     // positive = OTM
    if (pct < worstPct) {
      worstPct = pct;
      worstLeg = leg;
    }
  }

  if (!worstLeg) {
    return { label: "Strike Risk", score: 90, status: "good", detail: "Safe" };
  }

  let score: number;
  let status: "good" | "caution" | "danger";
  const legLabel = worstLeg.type === "short_call" ? "call" : "put";

  if (worstPct >= 10) {
    score = 100;
    status = "good";
  } else if (worstPct >= 5) {
    score = 80;
    status = "good";
  } else if (worstPct >= 2) {
    score = 55;
    status = "caution";
  } else if (worstPct >= 0) {
    score = 25;
    status = "caution";
  } else if (worstPct >= -3) {
    score = 10;
    status = "danger";
  } else {
    score = 0;
    status = "danger";
  }

  const detail = worstPct >= 0
    ? `$${worstLeg.strike} ${legLabel} is ${worstPct.toFixed(1)}% OTM`
    : `$${worstLeg.strike} ${legLabel} is ${Math.abs(worstPct).toFixed(1)}% ITM`;

  return { label: "Strike Risk", score, status, detail };
}

// ---------------------------------------------------------------------------
// Profit Progress (100 = max profit captured, 0 = max loss)
// ---------------------------------------------------------------------------

function scoreProfit(legs: PositionLeg[]): HealthDimension {
  const shortLegs = legs.filter((l) =>
    (l.type === "short_call" || l.type === "short_put") && l.currentPrice !== undefined
  );

  if (shortLegs.length === 0) {
    return { label: "Profit", score: 50, status: "good", detail: "No live pricing" };
  }

  // Average profit % across short legs
  let totalProfitPct = 0;
  for (const leg of shortLegs) {
    if (leg.entryPrice > 0 && leg.currentPrice !== undefined) {
      totalProfitPct += ((leg.entryPrice - leg.currentPrice) / leg.entryPrice) * 100;
    }
  }
  const avgProfitPct = totalProfitPct / shortLegs.length;

  let score: number;
  let status: "good" | "caution" | "danger";

  if (avgProfitPct >= 75) {
    score = 100;
    status = "good";
  } else if (avgProfitPct >= 50) {
    score = 85;
    status = "good";
  } else if (avgProfitPct >= 25) {
    score = 70;
    status = "good";
  } else if (avgProfitPct >= 0) {
    score = 50;
    status = "caution";
  } else if (avgProfitPct >= -50) {
    score = 25;
    status = "caution";
  } else {
    score = 5;
    status = "danger";
  }

  const detail = avgProfitPct >= 0
    ? `${avgProfitPct.toFixed(0)}% profit captured`
    : `${Math.abs(avgProfitPct).toFixed(0)}% underwater`;

  return { label: "Profit", score, status, detail };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function statusFromScore(score: number): { status: PositionHealth["status"]; color: PositionHealth["color"] } {
  if (score >= 70) return { status: "healthy", color: "emerald" };
  if (score >= 45) return { status: "watch", color: "amber" };
  if (score >= 25) return { status: "danger", color: "orange" };
  return { status: "critical", color: "red" };
}

export function calculateHealth(
  position: PositionInput,
  quote: QuoteData | null
): PositionHealth {
  const price = quote?.price ?? 0;

  const dte = scoreDTE(position.legs);
  const strike = scoreStrike(position.legs, price);
  const profit = scoreProfit(position.legs);

  // Weighted average: DTE 40%, Strike 35%, Profit 25%
  const overallScore = Math.round(dte.score * 0.4 + strike.score * 0.35 + profit.score * 0.25);
  const { status, color } = statusFromScore(overallScore);

  return {
    symbol: position.symbol,
    strategy: position.strategy,
    overallScore,
    status,
    color,
    dimensions: { dte, strike, profit },
  };
}
