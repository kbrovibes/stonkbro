/**
 * CSP Alpha Hunter — Claude Risk Analyst
 *
 * Sends the top CSP candidates with their technical enrichment, delta changes,
 * and earnings context to Claude for risk-adjusted analysis.
 */

import { generateText } from "@/lib/ai/provider";
import { CSPHunterCandidate } from "./csp-scanner";
import { ScanDelta } from "./csp-delta";

export type CSPAnalysis = {
  text: string;
  provider: string;
  fallback: boolean;
};

/**
 * Ask Claude to act as a risk manager and evaluate the top CSP candidates.
 * Returns structured analysis with recommendations.
 */
export async function analyzeCSPCandidates(
  candidates: CSPHunterCandidate[],
  delta: ScanDelta | null,
  capital: number
): Promise<CSPAnalysis> {
  // Take top 15 candidates for analysis (avoid token waste)
  const top = candidates.slice(0, 15);

  const candidateBlock = top
    .map((c, i) => {
      const lines = [
        `${i + 1}. ${c.symbol} — $${c.strike} Put, exp ${c.expiry} (${c.dte}d DTE)`,
        `   Price: $${c.currentPrice} | Mid: $${c.mid.toFixed(2)} | AROC: ${c.aroc}% | Δ: ${c.delta.toFixed(2)} | IV: ${(c.iv * 100).toFixed(1)}%`,
        `   Collateral: $${c.collateralRequired.toLocaleString()} | ${c.contractsAt100k} contracts @ $${c.totalPremium} premium`,
        `   ${c.distanceFromPrice}% OTM | OI: ${c.openInterest} | Vol: ${c.volume}`,
        `   RSI: ${c.rsi} | Tech Score: ${c.technicalScore}/100 | Support: $${c.supportLevel} ${c.nearSupport ? "(NEAR)" : ""}`,
        `   Juiciness: ${c.juiciness}/100 (${c.priority})`,
      ];
      if (c.earningsWithinDTE) {
        lines.push(`   ⚠️ EARNINGS within DTE: ${c.earningsDate} (${c.daysToEarnings}d away)`);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  // Delta summary if available
  let deltaBlock = "";
  if (delta && delta.totalChanges > 0) {
    const parts: string[] = [];
    if (delta.newEntries.length > 0) {
      parts.push(`NEW (${delta.newEntries.length}): ${delta.newEntries.map((d) => `${d.symbol} $${d.strike}`).join(", ")}`);
    }
    if (delta.premiumIncreased.length > 0) {
      parts.push(`PREMIUM UP (${delta.premiumIncreased.length}): ${delta.premiumIncreased.map((d) => `${d.symbol} $${d.strike} +${d.premiumChangePct}%`).join(", ")}`);
    }
    if (delta.premiumDecreased.length > 0) {
      parts.push(`PREMIUM DOWN (${delta.premiumDecreased.length}): ${delta.premiumDecreased.map((d) => `${d.symbol} $${d.strike} ${d.premiumChangePct}%`).join(", ")}`);
    }
    if (delta.dropped.length > 0) {
      parts.push(`DROPPED (${delta.dropped.length}): ${delta.dropped.map((d) => `${d.symbol} $${d.strike}`).join(", ")}`);
    }
    if (delta.supportLost.length > 0) {
      parts.push(`SUPPORT LOST (${delta.supportLost.length}): ${delta.supportLost.map((d) => `${d.symbol} $${d.strike}`).join(", ")}`);
    }
    deltaBlock = `\n\n## CHANGES SINCE LAST SCAN (${delta.hoursSinceLast}h ago)\n${parts.join("\n")}`;
  }

  const systemPrompt = `You are a senior options risk manager. You analyze Cash Secured Put (CSP) opportunities for a trader with $${capital.toLocaleString()} in available capital.

Your priorities:
1. RISK FIRST — warn about earnings events, overbought conditions, or thin liquidity
2. YIELD — identify the best risk-adjusted annualized returns
3. CAPITAL EFFICIENCY — suggest a portfolio of 3-5 CSPs that diversifies sector exposure
4. DELTA AWARENESS — highlight any significant changes from the previous scan

Format your response as:
## Top Picks (3-5 recommendations)
For each: ticker, strike, expiry, why it's attractive, risk factors

## Avoid These
Any candidates that look dangerous and why

## Portfolio Strategy
How to allocate the $${capital.toLocaleString()} across picks for best risk-adjusted yield

## Delta Alert
Any notable changes worth acting on (new opportunities, premium spikes, lost support)

Keep it concise and actionable. No disclaimers or caveats about not being financial advice.`;

  const prompt = `## CSP SCAN RESULTS — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

Capital: $${capital.toLocaleString()} | Candidates: ${candidates.length} across ${new Set(candidates.map((c) => c.symbol)).size} tickers

## TOP CANDIDATES

${candidateBlock}${deltaBlock}

Analyze these and give me your top 3-5 picks with full reasoning.`;

  const result = await generateText({
    prompt,
    systemPrompt,
    maxTokens: 2000,
    feature: "csp-hunter",
  });

  return {
    text: result.text,
    provider: result.provider,
    fallback: result.fallback,
  };
}
