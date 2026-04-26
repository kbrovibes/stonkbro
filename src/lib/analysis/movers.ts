import type { QuoteData } from "@/lib/market/types";
import { getQuotes } from "@/lib/market/yahoo";

/**
 * Scan universe — ~150 liquid, optionable stocks across sectors.
 * These are actively traded with options chains deep enough for put selling.
 */
export const SCAN_UNIVERSE = [
  // Mega-cap tech
  "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX", "AMD", "AVGO",
  // Growth
  "PLTR", "CRWD", "SNOW", "DDOG", "NET", "COIN", "SQ", "SHOP", "UBER", "RKLB",
  // Semis
  "MU", "QCOM", "MRVL", "AMAT", "LRCX", "ARM", "SMCI", "ASML",
  // Nuclear/Energy
  "OKLO", "SMR", "NNE", "LEU", "CCJ", "VST", "CEG", "XOM", "CVX",
  // Quantum
  "IONQ", "RGTI", "QBTS",
  // EV/Auto
  "RIVN", "LCID", "GM", "F",
  // Travel/Consumer
  "ABNB", "BKNG", "EXPE", "CAR", "UAL", "DAL", "AAL",
  // Fintech
  "SOFI", "AFRM", "HOOD", "NU", "UPST",
  // Biotech
  "HIMS", "RXRX", "CRSP", "MRNA", "BNTX",
  // Retail
  "COST", "WMT", "TGT", "LULU",
  // Industrial
  "CAT", "GE", "RTX", "LMT", "BA",
  // Finance
  "JPM", "GS", "MS", "V", "MA",
  // Health
  "UNH", "LLY", "ABBV",
  // Media
  "DIS", "PARA", "WBD",
  // Other momentum
  "MSTR", "RDDT", "CELH", "ASTS", "LUNR",
];

export type ExplosiveMover = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  volumeRatio: number;
  direction: "up" | "down";
  explosiveScore: number;
  suggestedPlay: string;
  reasoning: string;
};

/**
 * Detect explosive movers from a batch of quotes.
 *
 * Filters for |changePct| > 5% OR volumeRatio > 2.5, then ranks by
 * a combined "explosiveness" score (abs change * volume ratio).
 * Returns the top 10.
 */
export function detectExplosiveMovers(quotes: QuoteData[]): ExplosiveMover[] {
  const candidates = quotes.filter(
    (q) => Math.abs(q.changePct) > 5 || q.volumeRatio > 2.5
  );

  const scored = candidates.map((q): ExplosiveMover => {
    const direction: "up" | "down" = q.changePct >= 0 ? "up" : "down";
    const explosiveScore =
      Math.round(Math.abs(q.changePct) * q.volumeRatio * 100) / 100;

    const suggestedPlay = buildSuggestedPlay(direction, q.changePct, q.volumeRatio);
    const reasoning = buildReasoning(direction, q.changePct, q.volumeRatio);

    return {
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      changePct: Math.round(q.changePct * 100) / 100,
      volumeRatio: Math.round(q.volumeRatio * 100) / 100,
      direction,
      explosiveScore,
      suggestedPlay,
      reasoning,
    };
  });

  // Sort by explosiveness descending, take top 10
  scored.sort((a, b) => b.explosiveScore - a.explosiveScore);
  return scored.slice(0, 10);
}

function buildSuggestedPlay(
  direction: "up" | "down",
  changePct: number,
  volumeRatio: number
): string {
  if (direction === "up") {
    // Big surge with massive volume — ride the momentum with leverage
    if (changePct > 10 && volumeRatio > 3) {
      return "PMCC setup";
    }
    // Standard up move — sell puts to enter on a pullback
    return "Sell CSP";
  }

  // Down direction — only suggest CSP if not a total collapse
  if (changePct > -15) {
    return "Sell CSP";
  }

  // Extreme crash — too risky for put selling
  return "Watch only — too volatile for CSP";
}

function buildReasoning(
  direction: "up" | "down",
  changePct: number,
  volumeRatio: number
): string {
  const sign = changePct >= 0 ? "+" : "";
  const volDesc =
    volumeRatio >= 5
      ? `${volumeRatio.toFixed(1)}x volume — institutional activity`
      : volumeRatio >= 2.5
        ? `${volumeRatio.toFixed(1)}x volume — heavy interest`
        : `${volumeRatio.toFixed(1)}x volume`;

  if (direction === "up") {
    if (changePct > 10) {
      return `${sign}${changePct.toFixed(1)}% on ${volDesc} — explosive breakout`;
    }
    return `${sign}${changePct.toFixed(1)}% on ${volDesc} — momentum play`;
  }

  if (changePct < -10) {
    return `${changePct.toFixed(1)}% on ${volDesc} — sharp selloff, potential overreaction`;
  }
  return `${changePct.toFixed(1)}% on ${volDesc} — pullback opportunity`;
}

/**
 * Full scan: fetches quotes for the entire scan universe and detects movers.
 * Callable on-demand from API routes or cron jobs.
 */
export async function scanForMovers(): Promise<{
  movers: ExplosiveMover[];
  scannedCount: number;
}> {
  const quotes = await getQuotes(SCAN_UNIVERSE);
  const movers = detectExplosiveMovers(quotes);
  return { movers, scannedCount: quotes.length };
}
