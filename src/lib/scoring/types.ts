import type { QuoteData } from "@/lib/market/types";

export type ScoreBreakdown = {
  volume: number;       // 0-25: volume ratio spike detection
  momentum: number;     // 0-25: price momentum & trend strength
  technical: number;    // 0-25: SMA position, 52-week range
  earnings: number;     // 0-25: earnings proximity boost
};

export type ScoredStock = QuoteData & {
  score: number;              // 0-100 composite
  breakdown: ScoreBreakdown;
  grade: "A" | "B" | "C" | "D" | "F";
};
