/**
 * AI Earnings Plays — pre-earnings strategy generator.
 *
 * For each ticker approaching earnings:
 * 1. Fetch live options chain to check IV levels and straddle pricing
 * 2. Calculate at-the-money straddle cost (expected move)
 * 3. Use AI to suggest strategies (CSP, iron condor, straddle, etc.)
 *
 * Pure analysis functions + AI prompt builder.
 */

import type { QuoteData, OptionContract, OptionsChain } from "@/lib/market/types";
import type { EarningsEvent } from "@/lib/market/earnings";

export type EarningsPlayData = {
  symbol: string;
  name: string;
  price: number;
  earningsDate: string;
  daysUntil: number;
  timing: "before_market" | "after_market" | "unknown";

  // IV & straddle analysis
  atmStrike: number;
  atmCallIV: number | null;
  atmPutIV: number | null;
  straddleCost: number;        // ATM call mid + ATM put mid
  straddlePct: number;         // straddle cost as % of stock price (expected move)
  avgIV: number | null;        // average IV across near-term chain

  // Chain summary
  nearTermExpiry: string | null;
  nearTermDTE: number | null;
  chainAvailable: boolean;
};

/**
 * Analyze options chain for a ticker approaching earnings.
 */
export function analyzeEarningsIV(
  quote: QuoteData,
  chain: OptionsChain | null,
  event: EarningsEvent
): EarningsPlayData {
  const result: EarningsPlayData = {
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    earningsDate: event.earningsDate,
    daysUntil: event.daysUntil,
    timing: event.timing,
    atmStrike: 0,
    atmCallIV: null,
    atmPutIV: null,
    straddleCost: 0,
    straddlePct: 0,
    avgIV: null,
    nearTermExpiry: null,
    nearTermDTE: null,
    chainAvailable: false,
  };

  if (!chain || chain.calls.length === 0) return result;

  result.chainAvailable = true;

  // Find the nearest expiration AFTER earnings
  const earningsDate = new Date(event.earningsDate);
  const postEarningsExpiry = chain.expirations
    .map((exp) => ({ exp, date: new Date(exp) }))
    .filter((e) => e.date >= earningsDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  if (!postEarningsExpiry) return result;

  result.nearTermExpiry = postEarningsExpiry.exp;
  const dte = Math.ceil((postEarningsExpiry.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  result.nearTermDTE = dte;

  // Filter calls and puts for this expiration
  const expCalls = chain.calls.filter((c) => c.expiry === postEarningsExpiry.exp);
  const expPuts = chain.puts.filter((p) => p.expiry === postEarningsExpiry.exp);

  if (expCalls.length === 0 || expPuts.length === 0) return result;

  // Find ATM strike (closest to stock price)
  const atmCall = findATM(expCalls, quote.price);
  const atmPut = findATM(expPuts, quote.price);

  if (!atmCall || !atmPut) return result;

  result.atmStrike = atmCall.strike;
  result.atmCallIV = atmCall.iv ?? atmCall.impliedVolatility ?? null;
  result.atmPutIV = atmPut.iv ?? atmPut.impliedVolatility ?? null;

  // Straddle cost = ATM call mid + ATM put mid
  result.straddleCost = atmCall.mid + atmPut.mid;
  result.straddlePct = quote.price > 0 ? (result.straddleCost / quote.price) * 100 : 0;

  // Average IV across near-term chain
  const allIVs = [...expCalls, ...expPuts]
    .map((c) => c.iv ?? c.impliedVolatility)
    .filter((iv): iv is number => iv != null && iv > 0);
  result.avgIV = allIVs.length > 0 ? allIVs.reduce((a, b) => a + b, 0) / allIVs.length : null;

  return result;
}

function findATM(contracts: OptionContract[], price: number): OptionContract | null {
  if (contracts.length === 0) return null;
  return contracts.reduce((best, c) =>
    Math.abs(c.strike - price) < Math.abs(best.strike - price) ? c : best
  );
}

/**
 * Build an AI prompt for earnings play suggestions.
 */
export function buildEarningsPlayPrompt(plays: EarningsPlayData[]): string {
  const playsSummary = plays.map((p) => {
    const iv = p.avgIV != null ? `${(p.avgIV * 100).toFixed(0)}%` : "N/A";
    return [
      `**${p.symbol}** ($${p.price.toFixed(2)}) — earnings ${p.earningsDate} (${p.daysUntil}d, ${p.timing})`,
      `  ATM straddle: $${p.straddleCost.toFixed(2)} (${p.straddlePct.toFixed(1)}% expected move)`,
      `  Avg IV: ${iv} | Near-term expiry: ${p.nearTermExpiry || "N/A"} (${p.nearTermDTE || "N/A"} DTE)`,
      p.atmCallIV != null ? `  ATM Call IV: ${(p.atmCallIV * 100).toFixed(0)}% | ATM Put IV: ${((p.atmPutIV ?? 0) * 100).toFixed(0)}%` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return `You are an expert options strategist specializing in earnings plays. Analyze these stocks approaching earnings and suggest specific strategies.

For each stock, suggest ONE optimal pre-earnings strategy from:
- **Cash-Secured Put (CSP)**: Sell put below expected move for premium capture post-IV crush
- **Iron Condor**: Sell call + put spreads outside expected move, profit from IV crush
- **Put Credit Spread**: Bullish bias, sell put spread below expected move
- **Call Credit Spread**: Bearish bias, sell call spread above expected move
- **Straddle/Strangle Buy**: If expected move seems underpriced relative to historical earnings moves

Consider:
1. The straddle % tells you the market's expected move — strategies should be structured outside this range
2. Higher IV = more premium to sell, but also more risk
3. Post-earnings IV crush benefits premium sellers
4. Timing (BMO vs AMC) affects which expiration to target

## Stocks Approaching Earnings

${playsSummary}

## Response Format (JSON array)

Respond ONLY with a JSON array, no markdown fences:
[
  {
    "symbol": "TICKER",
    "strategy": "strategy name",
    "action": "specific action (e.g. Sell $150/$145 put spread)",
    "strikes": { "short": 150, "long": 145 },
    "expiry": "YYYY-MM-DD",
    "expectedPremium": 2.50,
    "maxRisk": 250,
    "maxReward": 250,
    "breakeven": 147.50,
    "rationale": "brief rationale",
    "riskLevel": "low|medium|high"
  }
]`;
}
