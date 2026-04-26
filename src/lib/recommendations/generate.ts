import { generateText } from "@/lib/ai/provider";
import { getQuotes } from "@/lib/market/yahoo";
import { analyzeMultiple, formatForClaude } from "@/lib/analysis/technicals";
import { supabaseAdmin } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export type RecommendationTheme = "moonshot" | "local_optimization" | "csp_premium";

export interface Pick {
  symbol: string;
  rationale: string;
  action: string;
  target?: string;
  risk?: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  annualizedReturn?: string;
  price?: number;
  changePct?: number;
}

export interface ThemeResult {
  theme: RecommendationTheme;
  picks: Pick[];
  generatedAt: string;
  expiresAt: string;
}

// Universe of liquid, optionable stocks to scan
const SCAN_UNIVERSE = [
  // Mega-cap tech
  "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX", "AMD", "AVGO",
  // Growth / momentum
  "PLTR", "CRWD", "SNOW", "DDOG", "NET", "MSTR", "COIN", "SQ", "SHOP", "UBER",
  // Semis
  "MU", "QCOM", "MRVL", "AMAT", "LRCX", "KLAC", "ARM", "SMCI",
  // Energy / industrial
  "XOM", "CVX", "LNG", "CAT", "GE", "RTX",
  // Consumer
  "COST", "WMT", "TGT", "NKE", "SBUX", "DIS",
  // Finance
  "JPM", "GS", "V", "MA",
  // Health
  "UNH", "LLY", "ABBV", "JNJ",
];

function loadPrompt(theme: RecommendationTheme): string {
  const filenames: Record<RecommendationTheme, string> = {
    moonshot: "moonshot.md",
    local_optimization: "local-optimization.md",
    csp_premium: "csp-premium.md",
  };
  const promptPath = path.join(process.cwd(), "src", "lib", "prompts", filenames[theme]);
  return fs.readFileSync(promptPath, "utf-8");
}

function nextExpiresAt(): string {
  // Expires in 2 hours (aligned with cron schedule)
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
}

async function generateForTheme(
  theme: RecommendationTheme,
  condensedSignals: string,
  today: string,
): Promise<Pick[]> {
  const promptTemplate = loadPrompt(theme);

  const result = await generateText({
    prompt: `${promptTemplate}

## Today's date: ${today}

## Pre-computed technical signals for the scan universe:

${condensedSignals}

Now analyze these signals and pick your 5 best ${theme.replace("_", " ")} candidates. Return ONLY the JSON array, wrapped in a json code fence.`,
    maxTokens: 3000,
  });

  const text = result.text;

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return [];
  }
}

export async function generateAllRecommendations(): Promise<ThemeResult[]> {
  // 1. Fetch quotes for the entire scan universe
  const quotes = await getQuotes(SCAN_UNIVERSE);
  const validSymbols = quotes.map((q) => q.symbol);

  // 2. Compute technicals locally
  const technicals = await analyzeMultiple(validSymbols, quotes);
  const condensed = formatForClaude(technicals);

  const today = new Date().toISOString().split("T")[0];
  const expiresAt = nextExpiresAt();
  const themes: RecommendationTheme[] = ["moonshot", "local_optimization", "csp_premium"];

  // 3. Generate all three themes in parallel
  const results = await Promise.allSettled(
    themes.map(async (theme) => {
      const picks = await generateForTheme(theme, condensed, today);

      // Enrich picks with live price data
      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
      const enriched = picks.map((p) => {
        const q = quoteMap.get(p.symbol);
        return { ...p, price: q?.price, changePct: q?.changePct };
      });

      // 4. Cache in DB
      await supabaseAdmin.from("daily_recommendations").insert({
        theme,
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
        picks: enriched,
        model: "auto",
      });

      return {
        theme,
        picks: enriched,
        generatedAt: new Date().toISOString(),
        expiresAt,
      };
    })
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<ThemeResult>).value);
}

export async function getCachedRecommendations(): Promise<ThemeResult[]> {
  const themes: RecommendationTheme[] = ["moonshot", "local_optimization", "csp_premium"];
  const results: ThemeResult[] = [];

  for (const theme of themes) {
    const { data } = await supabaseAdmin
      .from("daily_recommendations")
      .select("*")
      .eq("theme", theme)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      results.push({
        theme: data.theme,
        picks: data.picks as Pick[],
        generatedAt: data.generated_at,
        expiresAt: data.expires_at,
      });
    }
  }

  return results;
}
