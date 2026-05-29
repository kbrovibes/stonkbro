import fs from "node:fs";
import path from "node:path";
import { generateText } from "@/lib/ai/provider";
import type {
  AllocationAction,
  PortfolioAllocation,
  Rating,
  SuggestedAction,
  TickerAnalysis,
  TickerEnrichment,
  TickerSnapshot,
} from "./types";

const PROMPT_PATH = path.join(process.cwd(), "src/lib/prompts/portfolio-manager.md");

let _promptCache: string | null = null;
function loadPrompt(): string {
  if (_promptCache) return _promptCache;
  _promptCache = fs.readFileSync(PROMPT_PATH, "utf-8");
  return _promptCache;
}

function buildTickerBlock(
  snapshots: TickerSnapshot[],
  enrichments: Map<string, TickerEnrichment>
): string {
  const blocks: string[] = [];
  for (const s of snapshots) {
    const e = enrichments.get(s.symbol);
    const lines: string[] = [];
    lines.push(`### ${s.symbol}${e?.name ? ` — ${e.name}` : ""}`);
    lines.push(
      `- Position: ${s.units} sh @ avg $${(s.cost_basis / Math.max(s.units, 1e-9)).toFixed(2)} | MV $${s.market_value.toLocaleString(undefined, { maximumFractionDigits: 0 })} | unrealized ${s.unrealized_pnl_pct >= 0 ? "+" : ""}${s.unrealized_pnl_pct.toFixed(1)}%`
    );
    if (e) {
      lines.push(`- Price: $${e.price.toFixed(2)} | 1d ${signed(e.change_1d_pct)}% | 5d ${signed(e.change_5d_pct)}% | 30d ${signed(e.change_30d_pct)}% | 90d ${signed(e.change_90d_pct)}%`);
      lines.push(
        `- Technicals: RSI14 ${e.rsi_14 ?? "n/a"} | MACD ${e.macd ?? "n/a"} / sig ${e.macd_signal ?? "n/a"} | SMA50 $${e.sma_50?.toFixed(2) ?? "n/a"} (${e.above_50sma ? "ABOVE" : "BELOW"}) | SMA200 $${e.sma_200?.toFixed(2) ?? "n/a"} (${e.above_200sma ? "ABOVE" : "BELOW"}) | Vol ${e.volume_ratio.toFixed(2)}x avg`
      );
      lines.push(
        `- 52w: ${e.distance_from_52w_high_pct.toFixed(1)}% off high, ${e.distance_from_52w_low_pct.toFixed(1)}% above low${e.earnings_date ? ` | Next earnings: ${e.earnings_date}` : ""}`
      );
      if (e.news_headlines.length > 0) {
        lines.push(`- Recent headlines:`);
        for (const h of e.news_headlines.slice(0, 4)) {
          const dateStr = h.published_at.slice(0, 10);
          lines.push(`  • [${dateStr}] ${h.title}${h.publisher ? ` (${h.publisher})` : ""}`);
        }
      } else {
        lines.push(`- Recent headlines: (none retrieved)`);
      }
    } else {
      lines.push(`- (enrichment unavailable — work from position data + symbol knowledge)`);
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

function signed(n: number): string {
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

function extractJson(text: string): unknown {
  // Try fenced ```json blocks first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  // Find first { and last } to be tolerant of prose around the block
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

const VALID_RATINGS: Rating[] = ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"];
const VALID_ACTION_TYPES = new Set(["HOLD", "TRIM", "ADD", "EXIT"]);
const VALID_ALLOC_ACTIONS = new Set(["SELL", "TRIM", "HOLD", "ADD", "BUY"]);

function coerceSuggestedAction(raw: unknown): SuggestedAction {
  if (!raw || typeof raw !== "object") return { type: "HOLD" };
  const o = raw as Record<string, unknown>;
  const type = typeof o.type === "string" ? o.type.toUpperCase() : "HOLD";
  if (!VALID_ACTION_TYPES.has(type)) return { type: "HOLD" };
  if (type === "HOLD") return { type: "HOLD", note: typeof o.note === "string" ? o.note : undefined };
  if (type === "EXIT") return { type: "EXIT", note: typeof o.note === "string" ? o.note : undefined };
  const pct = Number(o.target_pct_of_position ?? 0);
  if (type === "TRIM") return { type: "TRIM", target_pct_of_position: Math.max(0, Math.min(100, pct)), note: typeof o.note === "string" ? o.note : undefined };
  return { type: "ADD", target_pct_of_position: Math.max(0, Math.min(100, pct)), note: typeof o.note === "string" ? o.note : undefined };
}

function coerceAnalysis(raw: unknown, enrichment: TickerEnrichment | undefined, snapshot: TickerSnapshot): TickerAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const symbol = typeof o.symbol === "string" ? o.symbol.toUpperCase() : snapshot.symbol;
  const ratingRaw = typeof o.rating === "string" ? o.rating.toUpperCase().replace(/[\s-]/g, "_") : "HOLD";
  const rating = (VALID_RATINGS.includes(ratingRaw as Rating) ? ratingRaw : "HOLD") as Rating;
  const confidence = Math.max(0, Math.min(100, Number(o.confidence ?? 50)));
  return {
    symbol,
    rating,
    confidence,
    thesis: typeof o.thesis === "string" ? o.thesis : "",
    reasons: Array.isArray(o.reasons) ? (o.reasons as unknown[]).filter((x) => typeof x === "string").map(String) : [],
    risks: Array.isArray(o.risks) ? (o.risks as unknown[]).filter((x) => typeof x === "string").map(String) : [],
    catalysts: Array.isArray(o.catalysts) ? (o.catalysts as unknown[]).filter((x) => typeof x === "string").map(String) : [],
    suggested_action: coerceSuggestedAction(o.suggested_action),
    enrichment: enrichment ?? emptyEnrichment(snapshot.symbol),
  };
}

function emptyEnrichment(symbol: string): TickerEnrichment {
  return {
    symbol,
    name: symbol,
    price: 0,
    change_1d_pct: 0,
    change_5d_pct: 0,
    change_30d_pct: 0,
    change_90d_pct: 0,
    rsi_14: null,
    macd: null,
    macd_signal: null,
    sma_50: null,
    sma_200: null,
    above_50sma: false,
    above_200sma: false,
    volume_ratio: 0,
    distance_from_52w_high_pct: 0,
    distance_from_52w_low_pct: 0,
    earnings_date: null,
    news_headlines: [],
  };
}

function coerceAllocation(raw: unknown, holdings_mv: number, free_cash: number): PortfolioAllocation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rawActions = Array.isArray(o.actions) ? o.actions : [];
  const actions: AllocationAction[] = rawActions
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const a = r as Record<string, unknown>;
      const action = typeof a.action === "string" ? a.action.toUpperCase() : "HOLD";
      if (!VALID_ALLOC_ACTIONS.has(action)) return null;
      return {
        symbol: typeof a.symbol === "string" ? a.symbol.toUpperCase() : "",
        action: action as AllocationAction["action"],
        dollar_amount: Math.max(0, Number(a.dollar_amount ?? 0)),
        rationale: typeof a.rationale === "string" ? a.rationale : "",
      };
    })
    .filter((x): x is AllocationAction => x !== null && x.symbol.length > 0);

  const released = actions.filter((a) => a.action === "SELL" || a.action === "TRIM").reduce((s, a) => s + a.dollar_amount, 0);
  const deployed = actions.filter((a) => a.action === "ADD" || a.action === "BUY").reduce((s, a) => s + a.dollar_amount, 0);
  const cashRemaining = free_cash + released - deployed;

  return {
    capital_budget: 100000,
    starting_state: { holdings_market_value: holdings_mv, free_cash },
    summary: typeof o.summary === "string" ? o.summary : "",
    actions,
    capital_released: Math.round(released),
    capital_deployed: Math.round(Math.min(deployed, 100000)),
    cash_remaining: Math.round(cashRemaining),
    risk_notes: Array.isArray(o.risk_notes) ? (o.risk_notes as unknown[]).filter((x) => typeof x === "string").map(String) : [],
  };
}

export type AnalyzeResult = {
  analyses: TickerAnalysis[];
  allocation: PortfolioAllocation | null;
  provider: string;
  model: string;
  fallback: boolean;
  input_tokens: number;
  output_tokens: number;
};

export async function analyzeAll(
  snapshots: TickerSnapshot[],
  enrichments: TickerEnrichment[],
  free_cash: number,
  userId?: string
): Promise<AnalyzeResult> {
  if (snapshots.length === 0) {
    return {
      analyses: [],
      allocation: null,
      provider: "none",
      model: "none",
      fallback: false,
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  const enrichMap = new Map(enrichments.map((e) => [e.symbol.toUpperCase(), e]));
  const holdings_mv = snapshots.reduce((s, x) => s + x.market_value, 0);
  const today = new Date().toISOString().slice(0, 10);

  const template = loadPrompt();
  const tickerBlock = buildTickerBlock(snapshots, enrichMap);
  const userPrompt = template
    .replace("{{TODAY}}", today)
    .replace("{{HOLDINGS_MV}}", holdings_mv.toLocaleString(undefined, { maximumFractionDigits: 0 }))
    .replace("{{FREE_CASH}}", free_cash.toLocaleString(undefined, { maximumFractionDigits: 0 }))
    .replace("{{TICKER_BLOCK}}", tickerBlock);

  const ai = await generateText({
    prompt: userPrompt,
    feature: "portfolio-manager",
    maxTokens: 8000,
    userId,
  });

  const parsed = extractJson(ai.text) as { analyses?: unknown[]; allocation?: unknown };

  // Map each snapshot to its analysis (preserve order; fall back to HOLD if missing)
  const aiAnalyses = Array.isArray(parsed.analyses) ? parsed.analyses : [];
  const analysesBySymbol = new Map<string, unknown>();
  for (const a of aiAnalyses) {
    if (a && typeof a === "object" && "symbol" in a) {
      const sym = String((a as Record<string, unknown>).symbol).toUpperCase();
      analysesBySymbol.set(sym, a);
    }
  }
  const analyses: TickerAnalysis[] = snapshots
    .map((s) => coerceAnalysis(analysesBySymbol.get(s.symbol.toUpperCase()) ?? null, enrichMap.get(s.symbol.toUpperCase()), s))
    .filter((x): x is TickerAnalysis => x !== null);

  const allocation = coerceAllocation(parsed.allocation, holdings_mv, free_cash);

  return {
    analyses,
    allocation,
    provider: ai.provider,
    model: ai.model,
    fallback: ai.fallback,
    input_tokens: ai.inputTokens,
    output_tokens: ai.outputTokens,
  };
}
