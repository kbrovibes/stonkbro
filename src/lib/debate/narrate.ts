/**
 * Turns deterministic ledgers into readable prose in ONE batched LLM call.
 *
 * Returns null on any failure so the caller renders the ledger itself — the
 * rating, scores and evidence are already complete without this layer.
 */

import fs from "node:fs";
import path from "node:path";
import { generateText } from "@/lib/ai/provider";
import type { DebateLedger, Evidence } from "./ledger";

export type DebateNarration = {
  symbol: string;
  bullCase: string;
  bearCase: string;
  verdict: string;
};

export type NarrationResult = {
  narrations: DebateNarration[];
  provider: string;
  model: string;
  fallback: boolean;
  inputTokens: number;
  outputTokens: number;
};

const PROMPT_PATH = path.join(process.cwd(), "src/lib/prompts/debate.md");
const DEFAULT_MAX_SYMBOLS = 10;

const FALLBACK_SYSTEM_PROMPT = `You are the research manager on a buy-side desk judging a bull/bear debate.
Weigh both sides on their merits, independent of the order they are presented in.
You do NOT set the rating — it was computed from the evidence and is correct. Explain why it follows.
A HOLD is a real answer; when evidence is balanced or thin, say so instead of manufacturing a direction.
Use only the numbers in the evidence. Write plain English: never use a term (theta, IV, delta, squeeze, golden cross, support, MACD, RSI) without a 5-10 word inline explanation.
For each symbol return bullCase (2 sentences max), bearCase (2 sentences max), verdict (1 sentence naming the rating).
Return ONLY a JSON array in a \`\`\`json fence with keys: symbol, bullCase, bearCase, verdict.`;

let _promptCache: string | null = null;
function loadPrompt(): string {
  if (_promptCache) return _promptCache;
  try {
    _promptCache = fs.readFileSync(PROMPT_PATH, "utf-8");
  } catch {
    _promptCache = FALLBACK_SYSTEM_PROMPT;
  }
  return _promptCache;
}

function serializeEvidence(items: Evidence[], marker: string): string {
  if (items.length === 0) return `  ${marker} (none)`;
  return items.map((e) => `  ${marker} ${e.code} w${e.weight} — ${e.detail}`).join("\n");
}

function serializeLedger(l: DebateLedger): string {
  const header = `${l.symbol} | rating ${l.rating} | bull ${l.bullScore} bear ${l.bearScore} net ${l.net} | confidence ${l.confidence}${l.insufficientEvidence ? " | INSUFFICIENT EVIDENCE" : ""}`;
  return [header, serializeEvidence(l.bull, "+"), serializeEvidence(l.bear, "-")].join("\n");
}

function extractJsonArray(text: string): unknown[] | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function coerce(raw: unknown, valid: Set<string>): DebateNarration | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const symbol = typeof item.symbol === "string" ? item.symbol.toUpperCase() : "";
  if (!valid.has(symbol)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const bullCase = str(item.bullCase);
  const bearCase = str(item.bearCase);
  const verdict = str(item.verdict);
  if (!bullCase && !bearCase && !verdict) return null;
  return { symbol, bullCase, bearCase, verdict };
}

export async function narrateDebates(
  ledgers: DebateLedger[],
  opts?: { userId?: string; maxSymbols?: number }
): Promise<NarrationResult | null> {
  const selected = ledgers.slice(0, opts?.maxSymbols ?? DEFAULT_MAX_SYMBOLS);
  if (selected.length === 0) return null;

  const valid = new Set(selected.map((l) => l.symbol.toUpperCase()));
  const prompt = [
    `Explain the verdict for these ${selected.length} stocks. Evidence codes are prefixed + for bull and - for bear, with their weight and the underlying numbers.`,
    "",
    selected.map(serializeLedger).join("\n\n"),
  ].join("\n");

  try {
    const ai = await generateText({
      prompt,
      systemPrompt: loadPrompt(),
      maxTokens: 3200,
      feature: "debate",
      userId: opts?.userId,
    });

    const parsed = extractJsonArray(ai.text);
    if (!parsed) return null;

    const narrations = parsed.map((r) => coerce(r, valid)).filter((n): n is DebateNarration => n !== null);
    if (narrations.length === 0) return null;

    return {
      narrations,
      provider: ai.provider,
      model: ai.model,
      fallback: ai.fallback,
      inputTokens: ai.inputTokens,
      outputTokens: ai.outputTokens,
    };
  } catch (e) {
    console.error("debate narration failed, falling back to ledger-only:", e);
    return null;
  }
}
