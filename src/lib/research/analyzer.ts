import Anthropic from "@anthropic-ai/sdk";
import type { QuoteData } from "@/lib/market/yahoo";

export type TradeSuggestion = {
  symbol: string;
  strategy: string;
  action: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  reasoning: string;
};

export type ResearchResult = {
  report: string;
  suggestions: TradeSuggestion[];
};

function buildQuoteSummary(quotes: QuoteData[]): string {
  return quotes
    .map((q) => {
      const pctFrom52High = (((q.fiftyTwoWeekHigh - q.price) / q.fiftyTwoWeekHigh) * 100).toFixed(1);
      const pctFrom52Low = (((q.price - q.fiftyTwoWeekLow) / q.fiftyTwoWeekLow) * 100).toFixed(1);
      const pctFrom50sma = (((q.price - q.fiftyDayAvg) / q.fiftyDayAvg) * 100).toFixed(1);
      const pctFrom200sma = (((q.price - q.twoHundredDayAvg) / q.twoHundredDayAvg) * 100).toFixed(1);

      return [
        `### ${q.symbol} — ${q.name}`,
        `- Price: $${q.price.toFixed(2)} (${q.change >= 0 ? "+" : ""}${q.changePct.toFixed(2)}% today)`,
        `- Volume: ${(q.volume / 1e6).toFixed(2)}M (${q.volumeRatio.toFixed(1)}x avg)`,
        `- Market Cap: $${(q.marketCap / 1e9).toFixed(1)}B`,
        `- 50-day SMA: $${q.fiftyDayAvg.toFixed(2)} (${q.above50sma ? "ABOVE" : "BELOW"}, ${pctFrom50sma}%)`,
        `- 200-day SMA: $${q.twoHundredDayAvg.toFixed(2)} (${q.above200sma ? "ABOVE" : "BELOW"}, ${pctFrom200sma}%)`,
        `- 52-week High: $${q.fiftyTwoWeekHigh.toFixed(2)} (${pctFrom52High}% below)`,
        `- 52-week Low: $${q.fiftyTwoWeekLow.toFixed(2)} (${pctFrom52Low}% above)`,
        q.earningsDate ? `- Next Earnings: ${q.earningsDate}` : `- Next Earnings: Unknown`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildPrompt(quotes: QuoteData[]): string {
  const quoteSummary = buildQuoteSummary(quotes);
  const today = new Date().toISOString().split("T")[0];

  return `You are an elite options strategist managing a $20,000 portfolio focused on premium selling and capital-efficient strategies. Today is ${today}.

Here is live market data for the stocks under analysis:

${quoteSummary}

---

## Your Task

Analyze each stock and produce TWO things:

### PART 1: Research Report

Write a concise but insightful research report covering:

1. **Market Context** — What's the overall environment telling us? Are we risk-on or risk-off? Any macro headwinds/tailwinds?

2. **Individual Stock Analysis** — For each ticker:
   - Technical posture (trend, support/resistance, SMA position, volume signals)
   - Where it sits in its 52-week range and what that implies
   - Upcoming catalysts or risks (especially earnings proximity)
   - Overall bias: bullish, bearish, or neutral

3. **Options Strategy Recommendations** — Specific, actionable trades:
   - **Cash-Secured Puts (CSPs)**: Target stocks that have pulled back to support with potentially elevated IV. Pick strikes at or below the 50-day SMA or recent support. Aim for 30-45 DTE. These are stocks you'd genuinely want to own at the strike price.
   - **Covered Calls (CCs)**: For stocks that are range-bound or approaching resistance. Suggest strikes above the 52-week high or near recent resistance. 30-45 DTE.
   - **Poor Man's Covered Calls (PMCCs)**: For stocks in a strong uptrend where buying 100 shares is too capital-intensive. Suggest deep ITM LEAPS (0.70-0.80 delta, 6-12 months out) paired with short OTM calls (0.20-0.30 delta, 30-45 DTE).
   - **Positions to Avoid**: Call out any stocks where the risk/reward is unfavorable, IV is too low to sell premium, or earnings timing makes options risky.

4. **Portfolio Construction** — How would you allocate the $20k across these opportunities? Consider:
   - Position sizing (no single position > 25% of capital)
   - Capital efficiency (PMCCs vs owning shares)
   - Risk concentration by sector
   - Cash reserve for adjustments

Be direct, opinionated, and specific. No hedging with "it depends" — make calls. Use approximate strike prices based on the current price levels.

### PART 2: Trade Suggestions (Structured)

After the report, output a JSON array of specific trade suggestions in exactly this format:

\`\`\`json
[
  {
    "symbol": "TICKER",
    "strategy": "CSP" | "CC" | "PMCC" | "AVOID",
    "action": "Sell 1x PUT $X strike expiring YYYY-MM-DD" | "Buy LEAPS $X call + Sell $Y call" | etc.,
    "strike": 150.00,
    "expiry": "2026-05-16",
    "premium": 3.50,
    "reasoning": "One sentence on why this specific trade."
  }
]
\`\`\`

For PMCC trades, use the LEAPS strike as "strike" and estimate the net debit as "premium" (negative number). For AVOID, omit strike/expiry/premium.

Be aggressive with your analysis but disciplined with risk management. Prioritize trades with the best risk/reward and highest probability of profit.`;
}

function parseResponse(text: string): ResearchResult {
  // Extract JSON from the response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  let suggestions: TradeSuggestion[] = [];

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (Array.isArray(parsed)) {
        suggestions = parsed.map((s: Record<string, unknown>) => ({
          symbol: String(s.symbol || ""),
          strategy: String(s.strategy || ""),
          action: String(s.action || ""),
          strike: typeof s.strike === "number" ? s.strike : undefined,
          expiry: typeof s.expiry === "string" ? s.expiry : undefined,
          premium: typeof s.premium === "number" ? s.premium : undefined,
          reasoning: String(s.reasoning || ""),
        }));
      }
    } catch (e) {
      console.error("Failed to parse trade suggestions JSON:", e);
    }
  }

  // Extract the report (everything before the JSON block)
  let report = text;
  if (jsonMatch) {
    const jsonStart = text.indexOf("```json");
    if (jsonStart > 0) {
      report = text.substring(0, jsonStart).trim();
    }
  }

  // Clean up any trailing "PART 2" header if present
  report = report.replace(/\n+#{1,3}\s*PART\s*2[\s\S]*$/, "").trim();

  return { report, suggestions };
}

export async function runDeepResearch(
  symbols: string[],
  quotes: QuoteData[]
): Promise<ResearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(quotes);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  if (!text) {
    throw new Error("Empty response from Claude");
  }

  return parseResponse(text);
}
