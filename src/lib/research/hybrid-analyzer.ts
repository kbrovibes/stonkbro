import Anthropic from "@anthropic-ai/sdk";
import { QuoteData } from "@/lib/market/types";
import { analyzeMultiple, formatForClaude, TechnicalSignals } from "@/lib/analysis/technicals";

export type HybridResult = {
  report: string;
  suggestions: {
    symbol: string;
    strategy: string;
    action: string;
    strike?: number;
    expiry?: string;
    premium?: number;
    reasoning: string;
  }[];
  technicals: TechnicalSignals[];
  mode: "hybrid";
  tokensSaved: string;
};

export async function runHybridResearch(
  symbols: string[],
  quotes: QuoteData[]
): Promise<HybridResult> {
  // Step 1: Compute all technicals in code (no AI needed)
  const technicals = await analyzeMultiple(symbols, quotes);

  // Step 2: Format condensed summary for Claude
  const condensed = formatForClaude(technicals);

  // Step 3: Short, focused Claude prompt
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are an options strategist managing a $20,000 portfolio. Below are pre-computed technical signals for stocks. The code has already calculated RSI, MACD, Bollinger Bands, SMAs, volume, support/resistance, and composite scores.

YOUR JOB: Don't recalculate anything. Instead:
1. Identify the top 3-5 actionable trades based on these signals
2. For each, recommend a specific strategy (CSP, CC, or PMCC) with reasoning
3. Consider: signal confluence, risk/reward, and which setups align best with income generation

TECHNICAL SIGNALS:
${condensed}

Respond in two parts:

PART 1 — ANALYSIS (brief, 3-4 paragraphs max):
Summarize the overall market picture from these signals. Which stocks stand out and why. What setups are actionable NOW vs need to wait.

PART 2 — TRADES (JSON array):
\`\`\`json
[
  {
    "symbol": "TICKER",
    "strategy": "CSP|CC|PMCC",
    "action": "brief action description",
    "reasoning": "2-3 sentence explanation referencing the specific signals"
  }
]
\`\`\`

Be specific. Reference the actual RSI, MACD, volume numbers in your reasoning. No generic advice.`,
      },
    ],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse response
  let report = responseText;
  let suggestions: HybridResult["suggestions"] = [];

  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      suggestions = JSON.parse(jsonMatch[1]);
    } catch {
      // Parse failed, keep empty
    }
    report = responseText.replace(/```json[\s\S]*?```/, "").trim();
  }

  // Clean up part headers
  report = report.replace(/PART\s*1[:\s—-]*(ANALYSIS)?/i, "").trim();
  report = report.replace(/PART\s*2[:\s—-]*(TRADES)?[\s\S]*$/i, "").trim();

  // Estimate tokens saved
  const fullPromptEstimate = symbols.length * 200; // ~200 tokens per stock in full mode
  const hybridPromptEstimate = condensed.length / 4; // ~4 chars per token
  const saved = Math.round(((fullPromptEstimate - hybridPromptEstimate) / fullPromptEstimate) * 100);

  return {
    report,
    suggestions,
    technicals,
    mode: "hybrid",
    tokensSaved: `~${saved}% fewer tokens`,
  };
}
