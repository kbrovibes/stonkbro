/**
 * Quantitative stock scoring engine.
 *
 * Scores each stock 0-100 across four dimensions (25 pts each):
 * - Volume: unusual volume detection (ratio to average)
 * - Momentum: price change direction & magnitude
 * - Technical: SMA position, 52-week range placement
 * - Earnings: proximity to earnings date (catalyst)
 *
 * Pure functions — no side effects, fully testable.
 */

import type { QuoteData } from "@/lib/market/types";
import type { ScoreBreakdown, ScoredStock } from "./types";

// ---------------------------------------------------------------------------
// Volume score (0-25)
// ---------------------------------------------------------------------------

function scoreVolume(q: QuoteData): number {
  const ratio = q.volumeRatio;

  if (ratio <= 0) return 0;
  if (ratio < 0.5) return 2;     // below average
  if (ratio < 1.0) return 5;     // normal
  if (ratio < 1.5) return 10;    // slightly elevated
  if (ratio < 2.0) return 15;    // notable
  if (ratio < 3.0) return 20;    // significant spike
  return 25;                      // extreme volume (3x+)
}

// ---------------------------------------------------------------------------
// Momentum score (0-25)
// ---------------------------------------------------------------------------

function scoreMomentum(q: QuoteData): number {
  const pct = q.changePct;
  let score = 0;

  // Direction: positive momentum gets a base
  if (pct > 0) score += 5;

  // Magnitude (absolute value of change)
  const absPct = Math.abs(pct);
  if (absPct >= 5) score += 10;
  else if (absPct >= 3) score += 8;
  else if (absPct >= 1.5) score += 5;
  else if (absPct >= 0.5) score += 3;

  // Strong up-move bonus
  if (pct >= 5) score += 5;
  else if (pct >= 3) score += 3;

  // Combined with volume = explosive signal
  if (pct > 2 && q.volumeRatio > 2) score += 5;

  return Math.min(25, score);
}

// ---------------------------------------------------------------------------
// Technical score (0-25)
// ---------------------------------------------------------------------------

function scoreTechnical(q: QuoteData): number {
  let score = 0;

  // SMA positioning
  if (q.above50sma) score += 7;
  if (q.above200sma) score += 7;

  // 52-week range position: where is price relative to range?
  if (q.fiftyTwoWeekHigh > 0 && q.fiftyTwoWeekLow > 0) {
    const range = q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow;
    if (range > 0) {
      const position = (q.price - q.fiftyTwoWeekLow) / range; // 0 = at low, 1 = at high

      // Sweet spot: upper half but not at the very top (breakout potential)
      if (position >= 0.7 && position < 0.95) score += 8;      // near highs, room to run
      else if (position >= 0.5 && position < 0.7) score += 6;  // mid-upper
      else if (position >= 0.3 && position < 0.5) score += 4;  // mid, possible bounce
      else if (position >= 0.95) score += 3;                     // at 52w high, extended
      else score += 1;                                           // lower range
    }
  }

  // Bonus: above both SMAs = confirmed uptrend
  if (q.above50sma && q.above200sma) score += 3;

  return Math.min(25, score);
}

// ---------------------------------------------------------------------------
// Earnings proximity score (0-25)
// ---------------------------------------------------------------------------

function scoreEarnings(q: QuoteData): number {
  if (!q.earningsDate) return 5; // neutral when unknown

  const now = new Date();
  const earnings = new Date(q.earningsDate);
  const daysUntil = Math.ceil((earnings.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 3;                   // recently reported
  if (daysUntil <= 3) return 25;                  // imminent — max catalyst
  if (daysUntil <= 7) return 20;                  // this week
  if (daysUntil <= 14) return 15;                 // next week or two — IV expansion
  if (daysUntil <= 30) return 10;                 // within a month
  return 5;                                        // far out
}

// ---------------------------------------------------------------------------
// Composite scoring
// ---------------------------------------------------------------------------

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

export function scoreStock(quote: QuoteData): ScoredStock {
  const breakdown: ScoreBreakdown = {
    volume: scoreVolume(quote),
    momentum: scoreMomentum(quote),
    technical: scoreTechnical(quote),
    earnings: scoreEarnings(quote),
  };

  const score = breakdown.volume + breakdown.momentum + breakdown.technical + breakdown.earnings;

  return {
    ...quote,
    score,
    breakdown,
    grade: gradeFromScore(score),
  };
}

export function scoreStocks(quotes: QuoteData[]): ScoredStock[] {
  return quotes.map(scoreStock).sort((a, b) => b.score - a.score);
}
