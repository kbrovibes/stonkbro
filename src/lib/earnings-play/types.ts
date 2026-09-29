import type { Bias, IvRegime, StrategyPlan } from "@/lib/options/earnings-strategies";
import type { VolSplit } from "@/lib/options/earnings-model";

export type { Bias, IvRegime, StrategyPlan, VolSplit };
export type Timing = "before_market" | "after_market" | "unknown";

export interface UpcomingEarning {
  symbol: string;
  name: string;
  earningsDate: string;
  timing: Timing;
  daysUntil: number;
  week: "this" | "next";
  price: number | null;
  changePct: number | null;
}

export interface UpcomingResponse {
  asOf: string;
  thisWeekOf: string;
  events: UpcomingEarning[];
}

export interface PastReaction {
  /** The session that reacted to the report. */
  date: string;
  reportDate: string | null;
  fiscalQuarter: string | null;
  movePct: number;
  /** EPS vs consensus, % — null when the report history wasn't available. */
  surprisePct: number | null;
  /** "reported" = real report date; "estimated" = biggest move near where the report should have been. */
  source: "reported" | "estimated";
}

export interface BiasDriver {
  label: string;
  weight: number;
}

export interface Headline {
  title: string;
  url: string;
  publisher?: string;
  publishedAt: string;
}

export interface Thesis {
  read: string;
  watch: string[];
  risks: string[];
}

export interface EarningsPlayAnalysis {
  symbol: string;
  name: string;
  asOf: string;
  spot: number;
  changePct: number;
  earningsDate: string;
  timing: Timing;
  timingLabel: string;
  daysUntil: number;
  entryDate: string;
  exitDate: string;
  expiry: string;
  impliedMovePct: number;
  impliedMoveUsd: number;
  straddleStrike: number;
  vol: VolSplit;
  pastReactions: PastReaction[];
  histAvgMovePct: number | null;
  regime: IvRegime;
  bias: Bias;
  biasScore: number;
  drivers: BiasDriver[];
  technicals: {
    rsi14: number;
    sma20: number;
    sma50: number;
    sma200: number;
    change5d: number;
    change20d: number;
    support: number;
    resistance: number;
    signals: string[];
  };
  news: { score: number; oneLine: string; flags: string[]; headlines: Headline[] };
  chart: Array<{ date: string; close: number; sma50: number | null }>;
  strategies: StrategyPlan[];
  thesis: Thesis | null;
}

export type AnalysisResult =
  | { ok: true; analysis: EarningsPlayAnalysis }
  | { ok: false; symbol: string; reason: string };
