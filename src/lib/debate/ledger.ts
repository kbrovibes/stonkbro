/**
 * Bull/Bear evidence ledger.
 *
 * Fully deterministic: every item comes from data we already computed, so a
 * ledger costs zero tokens and is reproducible. The LLM layer in ./narrate.ts
 * only explains the rating below — it never changes it.
 */

import type { TechnicalSignals } from "@/lib/analysis/technicals";
import type { CSPHunterCandidate } from "@/lib/options/csp-scanner";
import type { NewsSentiment } from "@/lib/news/sentiment";

export type EvidenceSide = "bull" | "bear";

export type Evidence = {
  side: EvidenceSide;
  code: string;
  label: string;
  weight: number;
  detail: string;
};

export type Rating = "BUY" | "OVERWEIGHT" | "HOLD" | "UNDERWEIGHT" | "SELL";

export type DebateLedger = {
  symbol: string;
  bull: Evidence[];
  bear: Evidence[];
  bullScore: number;
  bearScore: number;
  net: number;
  rating: Rating;
  confidence: "high" | "medium" | "low";
  insufficientEvidence: boolean;
};

export type BuildLedgerInput = {
  symbol: string;
  technicals: TechnicalSignals | null;
  candidate?: CSPHunterCandidate;
  news?: NewsSentiment;
};

const MIN_EVIDENCE = 4;
const CONFLICT_RATIO = 0.75;
const REFERENCE_ACCOUNT = 100_000;

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function technicalEvidence(t: TechnicalSignals): Evidence[] {
  const out: Evidence[] = [];
  const add = (side: EvidenceSide, code: string, label: string, weight: number, detail: string) =>
    out.push({ side, code, label, weight, detail });

  // A zero/absent moving average means we do not have enough price history to
  // judge the trend, which is different from the trend being bad.
  if (t.sma200 > 0) {
    if (t.above200sma) {
      add("bull", "ABOVE_200SMA", "Trading above its 200-day average price — the long-term trend is still up", 3, `${money(t.price)} vs 200-day average ${money(t.sma200)}`);
    } else {
      add("bear", "BELOW_200SMA", "Trading below its 200-day average price — the long-term trend has broken", 3.5, `${money(t.price)} vs 200-day average ${money(t.sma200)}`);
    }
  }

  if (t.sma50 > 0) {
    if (t.above50sma) {
      add("bull", "ABOVE_50SMA", "Also above its 50-day average — buyers are in control near-term too", 2, `${money(t.price)} vs 50-day average ${money(t.sma50)}`);
    } else {
      add("bear", "BELOW_50SMA", "Below its 50-day average — sellers have had the upper hand for weeks", 2, `${money(t.price)} vs 50-day average ${money(t.sma50)}`);
    }
  }

  if (t.goldenCross) {
    add("bull", "GOLDEN_CROSS", "The 50-day average has crossed above the 200-day one, a classic sign the trend has turned up", 2, `50-day ${money(t.sma50)} > 200-day ${money(t.sma200)}`);
  }

  if (t.macdCross === "bullish") {
    add("bull", "MACD_BULL_CROSS", "Momentum just flipped positive (MACD, a gauge of whether buying is accelerating)", 3, `MACD ${t.macdLine.toFixed(2)} crossed above signal ${t.macdSignal.toFixed(2)}`);
  } else if (t.macdCross === "bearish") {
    add("bear", "MACD_BEAR_CROSS", "Momentum just flipped negative (MACD, a gauge of whether selling is accelerating)", 3, `MACD ${t.macdLine.toFixed(2)} crossed below signal ${t.macdSignal.toFixed(2)}`);
  }

  if (t.rsi14 < 25) {
    add("bear", "RSI_FALLING_KNIFE", "Selling is extreme and still going (RSI, a 0-100 momentum meter, is under 25) — cheap does not mean done falling", 3.5, `RSI ${t.rsi14.toFixed(0)}, 5-day move ${pct(t.change5d)}`);
  } else if (t.rsi14 >= 30 && t.rsi14 <= 45 && t.change5d > 0) {
    add("bull", "RSI_RECOVERING", "Was oversold and is now turning up (RSI, a 0-100 momentum meter, is climbing back from the low 30s)", 3, `RSI ${t.rsi14.toFixed(0)}, 5-day move ${pct(t.change5d)}`);
  } else if (t.rsi14 > 70) {
    add("bear", "RSI_OVERBOUGHT", "Bought heavily and stretched (RSI, a 0-100 momentum meter, is over 70) — pullbacks usually follow", 2.5, `RSI ${t.rsi14.toFixed(0)}`);
  }

  if (t.nearestSupport > 0) {
    const distToSupport = ((t.price - t.nearestSupport) / t.price) * 100;
    if (distToSupport >= 0 && distToSupport <= 3) {
      add("bull", "NEAR_SUPPORT", "Sitting right on a price floor where buyers have stepped in before", 2.5, `${money(t.price)} is ${distToSupport.toFixed(1)}% above support at ${money(t.nearestSupport)}`);
    }
  }

  if (t.volumeSpike && t.change1d > 0) {
    add("bull", "VOLUME_SPIKE_UP", "Unusually heavy trading on an up day — real money is buying, not just drifting", 2, `${t.volumeRatio.toFixed(1)}x normal volume, ${pct(t.change1d)} on the day`);
  } else if (t.volumeSpike && t.change1d < 0) {
    add("bear", "VOLUME_SPIKE_DOWN", "Unusually heavy trading on a down day — real money is getting out", 2.5, `${t.volumeRatio.toFixed(1)}x normal volume, ${pct(t.change1d)} on the day`);
  }

  if (t.distFrom52Low > 30) {
    add("bull", "UPTREND_INTACT", "Well off its 12-month low, so the recovery is established rather than hopeful", 2, `${pct(t.distFrom52Low)} above the 52-week low`);
  }

  if (t.distFrom52High > 30) {
    add("bear", "BROKEN_FROM_HIGH", "Deep below its 12-month high — something changed and the stock has not recovered", 2.5, `${t.distFrom52High.toFixed(1)}% below the 52-week high`);
  }

  if (t.bbLower > 0 && t.bbPosition <= 0.2) {
    add("bull", "BB_LOWER_BAND", "At the low end of its normal trading range (Bollinger Bands, the price envelope it usually stays inside)", 2, `${money(t.price)} against a lower band of ${money(t.bbLower)}`);
  } else if (t.bbUpper > 0 && t.bbPosition > 0.95) {
    add("bear", "BB_UPPER_BAND", "At or above the top of its normal trading range (Bollinger Bands, the price envelope it usually stays inside) — little room left", 2, `${money(t.price)} against an upper band of ${money(t.bbUpper)}`);
  }

  if (t.change20d > 0 && t.change5d > 0) {
    add("bull", "MOMENTUM_POSITIVE", "Up over both the last week and the last month — the move is holding, not a one-day pop", 2.5, `5-day ${pct(t.change5d)}, 20-day ${pct(t.change20d)}`);
  } else if (t.change5d <= -8) {
    add("bear", "SHARP_DROP", "Fell hard in the last week, which usually means news the chart has not finished digesting", 3, `5-day ${pct(t.change5d)}`);
  }

  return out;
}

function candidateEvidence(c: CSPHunterCandidate, t: TechnicalSignals | null): Evidence[] {
  const out: Evidence[] = [];
  const add = (side: EvidenceSide, code: string, label: string, weight: number, detail: string) =>
    out.push({ side, code, label, weight, detail });

  const support = c.supportLevel || t?.nearestSupport || 0;
  if (support > 0 && c.strike < support) {
    add("bull", "STRIKE_BELOW_SUPPORT", "The strike you would be forced to buy at sits below the price floor buyers have defended", 2.5, `strike ${money(c.strike)} vs support ${money(support)}`);
  }

  const delta = Math.abs(c.delta);
  if (delta > 0.3) {
    add("bear", "DELTA_ELEVATED", "The option market puts a better-than-1-in-3 chance on you being assigned the shares (delta, roughly the odds of finishing in the money)", 2.5, `delta ${delta.toFixed(2)}, ${c.distanceFromPrice.toFixed(1)}% below spot`);
  }

  if (c.aroc > 60) {
    add("bear", "AROC_OUTLIER", "The yield is unusually rich, and the market only pays that much when it is genuinely scared of the stock", 2.5, `${c.aroc.toFixed(0)}% annualized on collateral, IV ${(c.iv * 100).toFixed(0)}%`);
  }

  if (c.mid > 0) {
    const spreadPct = ((c.ask - c.bid) / c.mid) * 100;
    if (spreadPct > 10) {
      add("bear", "WIDE_SPREAD", "The gap between buy and sell prices on this option is wide, so you lose real money getting in and out", 2, `bid ${money(c.bid)} / ask ${money(c.ask)}, ${spreadPct.toFixed(0)}% of mid`);
    }
  }

  if (c.openInterest < 250) {
    add("bear", "THIN_OPEN_INTEREST", "Very few contracts are outstanding, so closing early may be hard or expensive", 1.5, `${c.openInterest} open contracts, ${c.volume} traded today`);
  }

  if (c.earningsWithinDTE) {
    add("bear", "EARNINGS_BINARY", "Earnings land before this option expires — a coin flip the chart cannot price", 3, `earnings ${c.earningsDate ?? "TBD"}, ${c.daysToEarnings ?? "?"} days out vs ${c.dte} DTE`);
  }

  // The two below always fire. They are structural truths about selling a put,
  // not chart readings, so their absence would never be good news — it would
  // just mean the ledger forgot to mention what the trade actually costs.
  const utilization = c.collateralRequired / REFERENCE_ACCOUNT;
  const lockupWeight = utilization >= 0.5 ? 4 : utilization >= 0.25 ? 3 : utilization >= 0.1 ? 2 : utilization >= 0.05 ? 1 : 0.5;
  add(
    "bear",
    "CAPITAL_LOCKUP",
    "Cash is frozen as collateral until expiry — you cannot use it for anything else, however good the next idea is",
    lockupWeight,
    `${money(c.collateralRequired)} locked for ${c.dte} days, ${(utilization * 100).toFixed(0)}% of a ${money(REFERENCE_ACCOUNT)} account`
  );

  const maxLoss = Math.max(0, c.collateralRequired - c.premium);
  add(
    "bear",
    "CAPPED_UPSIDE",
    "The premium is the entire best case — you keep it and nothing more, while the downside runs all the way to zero",
    1.5,
    `best case ${money(c.premium)}, worst case ${money(maxLoss)} if the stock goes to zero`
  );

  return out;
}

function earningsEvidence(t: TechnicalSignals, candidate?: CSPHunterCandidate): Evidence[] {
  if (candidate) return [];
  if (t.daysToEarnings === null || t.daysToEarnings < 0 || t.daysToEarnings > 14) return [];
  return [
    {
      side: "bear",
      code: "EARNINGS_BINARY",
      label: "Earnings are days away — a coin flip the chart cannot price",
      weight: 3,
      detail: `earnings ${t.earningsDate ?? "TBD"}, ${t.daysToEarnings} days out`,
    },
  ];
}

function newsEvidence(n: NewsSentiment): Evidence[] {
  if (n.score === 0 || n.headlineCount === 0) return [];
  const materialityWeight = n.materiality === "high" ? 1.5 : n.materiality === "medium" ? 1 : 0.5;
  const weight = Math.min(3, Math.abs(n.score) * materialityWeight);
  if (weight < 0.5) return [];
  const flags = n.keywordFlags.length > 0 ? n.keywordFlags.join(", ").replace(/_/g, " ") : "general coverage";
  return [
    {
      side: n.score > 0 ? "bull" : "bear",
      code: n.score > 0 ? "NEWS_POSITIVE" : "NEWS_NEGATIVE",
      label: n.oneLine,
      weight: Math.round(weight * 10) / 10,
      detail: `news scored ${n.score > 0 ? "+" : ""}${n.score} on a -2..+2 scale, ${n.materiality} materiality, from ${n.headlineCount} recent headlines (matched: ${flags}; ${n.source === "llm" ? "headlines read" : "keyword-matched only"})`,
    },
  ];
}

const RANK: Record<DebateLedger["confidence"], number> = { low: 0, medium: 1, high: 2 };

function rate(net: number): Rating {
  if (net >= 12) return "BUY";
  if (net > 5) return "OVERWEIGHT";
  if (net >= -5) return "HOLD";
  if (net > -12) return "UNDERWEIGHT";
  return "SELL";
}

export function buildLedger(input: BuildLedgerInput): DebateLedger {
  const { symbol, technicals, candidate, news } = input;

  const evidence: Evidence[] = [];
  if (technicals) {
    evidence.push(...technicalEvidence(technicals));
    evidence.push(...earningsEvidence(technicals, candidate));
  }
  if (candidate) evidence.push(...candidateEvidence(candidate, technicals));
  if (news) evidence.push(...newsEvidence(news));

  const bull = evidence.filter((e) => e.side === "bull").sort((a, b) => b.weight - a.weight);
  const bear = evidence.filter((e) => e.side === "bear").sort((a, b) => b.weight - a.weight);

  const round = (n: number) => Math.round(n * 10) / 10;
  const bullScore = round(bull.reduce((s, e) => s + e.weight, 0));
  const bearScore = round(bear.reduce((s, e) => s + e.weight, 0));
  const net = round(bullScore - bearScore);

  const total = evidence.length;
  const insufficientEvidence = !technicals || total < MIN_EVIDENCE;

  if (insufficientEvidence) {
    return { symbol, bull, bear, bullScore, bearScore, net, rating: "HOLD", confidence: "low", insufficientEvidence: true };
  }

  // Two well-matched sides is not a weak signal to be split — it is a genuine
  // standoff, and calling a direction anyway would be manufacturing one.
  const high = Math.max(bullScore, bearScore);
  const low = Math.min(bullScore, bearScore);
  const conflicted = high > 0 && low / high >= CONFLICT_RATIO;

  if (conflicted) {
    return { symbol, bull, bear, bullScore, bearScore, net, rating: "HOLD", confidence: "low", insufficientEvidence: false };
  }

  const magnitude = Math.abs(net);
  const earned: DebateLedger["confidence"] =
    total >= 8 && magnitude >= 10 ? "high" : total >= 5 && magnitude >= 4 ? "medium" : "low";

  // An empty side means no detector fired, which describes our coverage rather
  // than the stock. A one-sided ledger is a thin ledger, so cap what it can claim.
  const oneSided = bull.length === 0 || bear.length === 0;
  const ceiling: DebateLedger["confidence"] = !oneSided
    ? "high"
    : Math.max(bull.length, bear.length) < 3
      ? "low"
      : "medium";

  const confidence = RANK[earned] <= RANK[ceiling] ? earned : ceiling;

  return { symbol, bull, bear, bullScore, bearScore, net, rating: rate(net), confidence, insufficientEvidence: false };
}
