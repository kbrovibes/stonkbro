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

export interface RecommendationBatch {
  id: string;
  status: "running" | "completed" | "failed";
  themes: ThemeResult[];
  createdAt: string;
  error?: string;
}

const SCAN_UNIVERSE = [
  "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX", "AMD", "AVGO",
  "PLTR", "CRWD", "SNOW", "DDOG", "NET", "MSTR", "COIN", "SQ", "SHOP", "UBER",
  "MU", "QCOM", "MRVL", "AMAT", "LRCX", "KLAC", "ARM", "SMCI",
  "XOM", "CVX", "LNG", "CAT", "GE", "RTX",
  "COST", "WMT", "TGT", "NKE", "SBUX", "DIS",
  "JPM", "GS", "V", "MA",
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

  const jsonMatch = result.text.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return [];
  }
}

/**
 * Create a "running" batch record and return the ID immediately.
 */
export async function createPendingBatch(userId?: string): Promise<string> {
  // Insert a placeholder for each theme
  const batchId = crypto.randomUUID();
  const themes: RecommendationTheme[] = ["moonshot", "local_optimization", "csp_premium"];

  for (const theme of themes) {
    await supabaseAdmin.from("daily_recommendations").insert({
      id: `${batchId}-${theme}`,
      user_id: userId || null,
      theme,
      status: "running",
      generated_at: new Date().toISOString(),
      expires_at: nextExpiresAt(),
      picks: [],
      model: "auto",
    });
  }

  return batchId;
}

/**
 * Generate all recommendations and update the batch records.
 */
export async function generateAllRecommendations(batchId?: string, userId?: string): Promise<ThemeResult[]> {
  const actualBatchId = batchId || crypto.randomUUID();
  const themes: RecommendationTheme[] = ["moonshot", "local_optimization", "csp_premium"];

  // If no batch was pre-created, create running records now
  if (!batchId) {
    for (const theme of themes) {
      await supabaseAdmin.from("daily_recommendations").upsert({
        id: `${actualBatchId}-${theme}`,
        user_id: userId || null,
        theme,
        status: "running",
        generated_at: new Date().toISOString(),
        expires_at: nextExpiresAt(),
        picks: [],
        model: "auto",
      });
    }
  }

  try {
    const quotes = await getQuotes(SCAN_UNIVERSE);
    const validSymbols = quotes.map((q) => q.symbol);
    const technicals = await analyzeMultiple(validSymbols, quotes);
    const condensed = formatForClaude(technicals);
    const today = new Date().toISOString().split("T")[0];
    const expiresAt = nextExpiresAt();

    const results = await Promise.allSettled(
      themes.map(async (theme) => {
        try {
          const picks = await generateForTheme(theme, condensed, today);
          const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
          const enriched = picks.map((p) => {
            const q = quoteMap.get(p.symbol);
            return { ...p, price: q?.price, changePct: q?.changePct };
          });

          // Update record as completed
          await supabaseAdmin
            .from("daily_recommendations")
            .update({ status: "completed", picks: enriched, expires_at: expiresAt })
            .eq("id", `${actualBatchId}-${theme}`);

          return { theme, picks: enriched, generatedAt: new Date().toISOString(), expiresAt };
        } catch (e) {
          await supabaseAdmin
            .from("daily_recommendations")
            .update({ status: "failed", error_message: String(e) })
            .eq("id", `${actualBatchId}-${theme}`);
          throw e;
        }
      })
    );

    return results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<ThemeResult>).value);
  } catch (e) {
    // Mark all as failed
    for (const theme of themes) {
      await supabaseAdmin
        .from("daily_recommendations")
        .update({ status: "failed", error_message: String(e) })
        .eq("id", `${actualBatchId}-${theme}`);
    }
    throw e;
  }
}

export async function getCachedRecommendations(): Promise<ThemeResult[]> {
  const themes: RecommendationTheme[] = ["moonshot", "local_optimization", "csp_premium"];
  const results: ThemeResult[] = [];

  for (const theme of themes) {
    const { data } = await supabaseAdmin
      .from("daily_recommendations")
      .select("*")
      .eq("theme", theme)
      .eq("status", "completed")
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

export async function getRecommendationHistory(limit = 10): Promise<RecommendationBatch[]> {
  const { data } = await supabaseAdmin
    .from("daily_recommendations")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(limit * 3); // 3 themes per batch

  if (!data) return [];

  // Group by batch (records created at the same time)
  const batches = new Map<string, { themes: ThemeResult[]; status: string; createdAt: string; error?: string }>();

  for (const row of data) {
    // Batch key = generated_at rounded to the minute
    const batchKey = row.id.includes("-") ? row.id.split("-").slice(0, -1).join("-") : row.generated_at;

    if (!batches.has(batchKey)) {
      batches.set(batchKey, { themes: [], status: row.status, createdAt: row.generated_at, error: row.error_message });
    }
    const batch = batches.get(batchKey)!;

    if (row.status === "running") batch.status = "running";
    if (row.status === "failed" && batch.status !== "running") batch.status = "failed";

    if (row.status === "completed" && row.picks) {
      batch.themes.push({
        theme: row.theme,
        picks: row.picks as Pick[],
        generatedAt: row.generated_at,
        expiresAt: row.expires_at,
      });
    }
  }

  return [...batches.entries()]
    .map(([id, b]) => ({
      id,
      status: b.status as "running" | "completed" | "failed",
      themes: b.themes,
      createdAt: b.createdAt,
      error: b.error,
    }))
    .slice(0, limit);
}

export async function getRunningBatches(): Promise<{ id: string; theme: string; status: string }[]> {
  const { data } = await supabaseAdmin
    .from("daily_recommendations")
    .select("id, theme, status")
    .eq("status", "running")
    .order("generated_at", { ascending: false })
    .limit(3);

  return data || [];
}
