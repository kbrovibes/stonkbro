/**
 * Bloodbath AI verdicts — one batched generateText call for up to 12 tickers,
 * fed by recent Yahoo headlines. Shared by the cron and the on-demand API route.
 */

import { generateText } from "@/lib/ai/provider";
import { getRecentHeadlines } from "@/lib/market/yahoo-news";

export const MAX_VERDICT_TICKERS = 12;

export type VerdictInputTicker = {
  symbol: string;
  price: number;
  changePct: number;
  drawdownPct: number;
  fourWeekChangePct: number;
  belowFiftySMA: boolean;
  volumeRatio: number;
  isWatchlist: boolean;
};

export type BloodbathVerdict = {
  symbol: string;
  verdict: "BUY_DIP" | "NIBBLE" | "WAIT" | "AVOID";
  confidence: "high" | "medium" | "low";
  reasons: string[];
  entryIdea: string;
};

export type VerdictResult = {
  verdicts: BloodbathVerdict[];
  aiProvider: string;
  aiModel: string;
};

const VALID_VERDICTS = new Set(["BUY_DIP", "NIBBLE", "WAIT", "AVOID"]);

/** Watchlist names first (already worst-first within each list), capped. */
export function pickVerdictTargets<T extends VerdictInputTicker>(tickers: T[]): T[] {
  return [
    ...tickers.filter((t) => t.isWatchlist),
    ...tickers.filter((t) => !t.isWatchlist),
  ].slice(0, MAX_VERDICT_TICKERS);
}

/** Extract the first JSON array from AI output, repairing a truncated tail if needed. */
function parseVerdicts(text: string): BloodbathVerdict[] {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array in AI response");
  let raw = text.slice(start);
  const end = raw.lastIndexOf("]");
  if (end !== -1) raw = raw.slice(0, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Walk back to the last complete object and close the array.
    const lastComplete = raw.lastIndexOf("},");
    if (lastComplete === -1) throw new Error("Unparseable AI response");
    parsed = JSON.parse(raw.slice(0, lastComplete + 1) + "]");
  }

  if (!Array.isArray(parsed)) throw new Error("AI response is not an array");
  return parsed
    .filter(
      (v): v is BloodbathVerdict =>
        typeof v === "object" && v !== null &&
        typeof (v as BloodbathVerdict).symbol === "string" &&
        VALID_VERDICTS.has((v as BloodbathVerdict).verdict)
    )
    .map((v) => ({
      symbol: v.symbol.toUpperCase(),
      verdict: v.verdict,
      confidence: ["high", "medium", "low"].includes(v.confidence) ? v.confidence : "medium",
      reasons: Array.isArray(v.reasons) ? v.reasons.filter((r) => typeof r === "string").slice(0, 3) : [],
      entryIdea: typeof v.entryIdea === "string" ? v.entryIdea : "",
    }));
}

export async function generateBloodbathVerdicts(
  tickers: VerdictInputTicker[],
  userId?: string
): Promise<VerdictResult> {
  const targets = tickers.slice(0, MAX_VERDICT_TICKERS);

  const headlinesBySymbol = await Promise.all(
    targets.map(async (t) => {
      const headlines = await getRecentHeadlines(t.symbol, 3);
      return { symbol: t.symbol, headlines };
    })
  );
  const headlineMap = new Map(headlinesBySymbol.map((h) => [h.symbol, h.headlines]));

  const tickerBlocks = targets.map((t) => {
    const headlines = (headlineMap.get(t.symbol) ?? [])
      .map((h) => `  - ${h.title} (${h.publisher ?? "?"}, ${h.published_at})`)
      .join("\n");
    return [
      `${t.symbol}${t.isWatchlist ? " (on my watchlist)" : ""}:`,
      `  price $${t.price}, today ${t.changePct}%, off 4-week peak ${t.drawdownPct}%, 4-week change ${t.fourWeekChangePct}%`,
      `  ${t.belowFiftySMA ? "below" : "above"} 50-day SMA, volume ${t.volumeRatio}x average`,
      headlines ? `  recent headlines:\n${headlines}` : "  recent headlines: none found",
    ].join("\n");
  });

  const prompt = `The market is in a pullback. For each ticker below, explain briefly WHY it has sold off recently (use the headlines + stats; if unclear, say it's likely macro/sector-driven) and give a dip-buying verdict.

${tickerBlocks.join("\n\n")}

Respond with ONLY a JSON array, one object per ticker, in this exact shape:
[{"symbol":"TICK","verdict":"BUY_DIP|NIBBLE|WAIT|AVOID","confidence":"high|medium|low","reasons":["short reason 1","short reason 2"],"entryIdea":"one concrete entry idea (a limit price level, or a cash-secured put strike/expiry style idea)"}]

Verdict guide: BUY_DIP = quality name, drop looks overdone/macro-driven, good entry. NIBBLE = start a partial position or sell a conservative CSP. WAIT = falling knife or catalyst pending, keep on watch. AVOID = drop is fundamentals-driven, stay away. Keep every reason under 15 words.`;

  const result = await generateText({
    prompt,
    systemPrompt:
      "You are a blunt, risk-aware personal financial assistant for an experienced options trader. You never hedge with disclaimers. You output strictly valid JSON.",
    maxTokens: 8000,
    feature: "bloodbath",
    userId,
  });

  return {
    verdicts: parseVerdicts(result.text),
    aiProvider: result.provider,
    aiModel: result.model,
  };
}
