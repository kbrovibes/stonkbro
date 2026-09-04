/**
 * Batched news sentiment.
 *
 * Two layers:
 *  1. A deterministic keyword classifier that costs zero tokens and always runs.
 *  2. ONE batched LLM call covering every symbol that actually has headlines.
 *
 * The LLM layer is strictly an upgrade — if it fails for any reason the keyword
 * map is returned unchanged. This function never throws.
 */

import { generateText } from "@/lib/ai/provider";
import { getRecentHeadlines } from "@/lib/market/yahoo-news";
import type { NewsHeadline } from "@/lib/portfolio-manager/types";

export type NewsSentiment = {
  symbol: string;
  score: number; // -2..+2
  materiality: "high" | "medium" | "low";
  oneLine: string;
  headlineCount: number;
  keywordFlags: string[];
  source: "llm" | "keyword";
};

const HEADLINES_PER_SYMBOL = 5;
const FETCH_CONCURRENCY = 5;
const MAX_LLM_SYMBOLS = 25;

type FlagRule = { flag: string; score: number; patterns: RegExp[] };

const FLAG_RULES: FlagRule[] = [
  {
    flag: "guidance_raise",
    score: 2,
    patterns: [/rais\w*[^.]{0,25}\b(?:guidance|outlook|forecast)\b/i, /\b(?:guidance|outlook|forecast)\b[^.]{0,20}\b(?:raised|hiked|boosted|lifted)\b/i],
  },
  {
    flag: "guidance_cut",
    score: -2,
    patterns: [/\b(?:cuts?|lowers?|slashe?s?|trims?|reduces?)\b[^.]{0,25}\b(?:guidance|outlook|forecast)\b/i, /\b(?:guidance|outlook|forecast)\b[^.]{0,20}\b(?:cut|lowered|slashed|withdrawn|pulled|suspended)\b/i, /warns\b[^.]{0,25}\b(?:guidance|outlook|revenue|demand)\b/i],
  },
  {
    flag: "earnings_beat",
    score: 1.5,
    patterns: [/\b(?:beats?|tops|surpasses)\b[^.]{0,25}\b(?:earnings|estimates|expectations|revenue|eps|views?)\b/i, /\bearnings beat\b/i, /better[- ]than[- ]expected/i],
  },
  {
    flag: "earnings_miss",
    score: -2,
    patterns: [/\b(?:misses|missed)\b[^.]{0,25}\b(?:earnings|estimates|expectations|revenue|eps|views?)\b/i, /\bearnings miss\b/i, /worse[- ]than[- ]expected/i, /disappointing\b[^.]{0,20}\b(?:results|earnings|quarter)\b/i],
  },
  {
    flag: "upgrade",
    score: 1,
    patterns: [/\bupgrade[sd]?\b/i, /rais\w*[^.]{0,20}\bprice target\b/i, /\b(?:price target|pt)\b[^.]{0,20}\b(?:raised|hiked|lifted|boosted)\b/i, /\binitiated?\b[^.]{0,25}\b(?:buy|outperform|overweight)\b/i],
  },
  {
    flag: "downgrade",
    score: -1,
    patterns: [/\bdowngrade[sd]?\b/i, /\b(?:cuts?|lowers?|slashe?s?)\b[^.]{0,20}\bprice target\b/i, /\b(?:price target|pt)\b[^.]{0,20}\b(?:cut|lowered|slashed)\b/i, /\binitiated?\b[^.]{0,25}\b(?:sell|underperform|underweight)\b/i],
  },
  {
    flag: "lawsuit",
    score: -1,
    patterns: [/\blawsuits?\b/i, /class action/i, /\bsue[sd]?\b/i, /\bsubpoena\b/i, /\b(?:sec|doj|ftc)\b[^.]{0,25}\b(?:probe|investigation|inquiry|charges|sues)\b/i, /\bantitrust\b/i, /\bsettles?\b[^.]{0,20}\b(?:suit|claims|charges)\b/i],
  },
  {
    flag: "offering",
    score: -1.5,
    patterns: [/\b(?:share|stock|common|secondary|public|convertible|notes|debt|at[- ]the[- ]market)\b[^.]{0,25}\boffering\b/i, /\bequity offering\b/i, /\boffering\b[^.]{0,25}\b(?:shares|stock|common|notes)\b/i, /\bdilut\w+/i, /prices?\b[^.]{0,25}\$[\d.]+ ?(?:million|billion|m|b)?[^.]{0,25}\boffering\b/i],
  },
  {
    flag: "ma",
    score: 1.5,
    patterns: [/\bto acquire\b/i, /\bacquisitions? of\b/i, /\bacquires\b/i, /\bmerger\b/i, /\bbuyout\b/i, /\btakeover\b/i, /agrees to buy/i, /\bto be acquired\b/i, /\bgo(?:ing)? private\b/i],
  },
  {
    flag: "fda",
    score: 2,
    patterns: [/\bfda\b[^.]{0,40}\b(?:approv\w*|clear\w*|grant\w*|authoriz\w*)/i, /\b(?:approval|approved|cleared)\b[^.]{0,30}\bfda\b/i, /\b(?:receives|wins|gains|secures|snags)\b[^.]{0,30}\bapproval\b/i, /breakthrough therapy/i, /\bmet?e?ts?\b[^.]{0,20}\bprimary endpoint\b/i],
  },
  {
    flag: "fda",
    score: -2,
    patterns: [/\bfda\b[^.]{0,40}\b(?:reject\w*|declin\w*|refus\w*|warning letter)/i, /complete response letter/i, /\bcrl\b/, /\b(?:failed|fails|misses)\b[^.]{0,25}\bendpoint\b/i, /clinical hold/i, /\btrials?\b[^.]{0,20}\b(?:halted|discontinued|paused|failed)\b/i, /\brecalls?\b/i],
  },
  {
    flag: "contract_win",
    score: 1.5,
    patterns: [/\b(?:wins|won|awarded|secures|lands|receives|bags)\b[^.]{0,35}\b(?:contract|deal|order|award)\b/i, /contract award/i, /\bpartnership\b/i, /\bpartners with\b/i, /\b(?:deal|pact|agreement) with\b/i, /\bselected by\b/i],
  },
  {
    flag: "insider_selling",
    score: -1,
    patterns: [/\binsider\b[^.]{0,30}\b(?:sold|sells|selling|sales)\b/i, /\b(?:ceo|cfo|coo|president|chairman|executive|director|founder|officer)\b[^.]{0,45}\b(?:sold|sells)\b/i, /\bsold shares\b/i, /\bform 4\b/i],
  },
  {
    flag: "exec_departure",
    score: -1,
    patterns: [/\b(?:ceo|cfo|coo|cto|president|chairman)\b[^.]{0,45}\b(?:steps? down|stepping down|resign\w*|exits?|exit\b|departs?|departure|to leave|ousted|fired|out at)\b/i, /\b(?:steps? down|stepping down|resigns?)\b[^.]{0,25}\bas (?:ceo|cfo|coo|cto|president)\b/i],
  },
  {
    flag: "short_report",
    score: -2,
    patterns: [/\bshort (?:seller|report)\b/i, /hindenburg|citron|muddy waters|scorpion capital|kerrisdale|culper|grizzly research/i, /accus\w+[^.]{0,25}\b(?:fraud|accounting)\b/i, /\bfraud allegations?\b/i, /\baccounting (?:irregularities|probe)\b/i],
  },
];

const MATERIAL_FLAGS = new Set(["guidance_cut", "guidance_raise", "earnings_beat", "earnings_miss", "offering", "ma", "fda", "short_report", "contract_win", "exec_departure"]);

function clampScore(n: number): number {
  return Math.max(-2, Math.min(2, Math.round(n * 10) / 10));
}

function dedupeHeadlines(headlines: NewsHeadline[]): NewsHeadline[] {
  const seen = new Set<string>();
  const out: NewsHeadline[] = [];
  for (const h of headlines) {
    const key = h.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

function classifyKeywords(symbol: string, headlines: NewsHeadline[]): NewsSentiment {
  if (headlines.length === 0) {
    return { symbol, score: 0, materiality: "low", oneLine: "No recent headlines.", headlineCount: 0, keywordFlags: [], source: "keyword" };
  }

  const flags: string[] = [];
  const hits: { flag: string; score: number; title: string }[] = [];

  for (const h of headlines) {
    for (const rule of FLAG_RULES) {
      if (rule.patterns.some((p) => p.test(h.title))) {
        hits.push({ flag: rule.flag, score: rule.score, title: h.title });
        if (!flags.includes(rule.flag)) flags.push(rule.flag);
      }
    }
  }

  if (hits.length === 0) {
    return {
      symbol,
      score: 0,
      materiality: "low",
      oneLine: `${headlines.length} recent ${headlines.length === 1 ? "headline" : "headlines"}, none flagging a specific event.`,
      headlineCount: headlines.length,
      keywordFlags: [],
      source: "keyword",
    };
  }

  // Strongest single event drives the score; the rest nudge it so a pile of
  // small negatives can still outweigh one modest positive.
  const strongest = hits.reduce((a, b) => (Math.abs(b.score) > Math.abs(a.score) ? b : a));
  const rest = hits.filter((h) => h !== strongest).reduce((sum, h) => sum + h.score * 0.35, 0);
  const score = clampScore(strongest.score + rest);

  const material = flags.some((f) => MATERIAL_FLAGS.has(f));
  const materiality: NewsSentiment["materiality"] = material && Math.abs(score) >= 1.5 ? "high" : material || Math.abs(score) >= 1 ? "medium" : "low";

  return {
    symbol,
    score,
    materiality,
    oneLine: `Headlines flag ${flags.join(", ").replace(/_/g, " ")} — the strongest is "${strongest.title}".`,
    headlineCount: headlines.length,
    keywordFlags: flags,
    source: "keyword",
  };
}

async function fetchAll(symbols: string[]): Promise<Map<string, NewsHeadline[]>> {
  const out = new Map<string, NewsHeadline[]>();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, symbols.length) }, async () => {
    while (cursor < symbols.length) {
      const symbol = symbols[cursor++];
      try {
        out.set(symbol, dedupeHeadlines(await getRecentHeadlines(symbol, HEADLINES_PER_SYMBOL)));
      } catch {
        out.set(symbol, []);
      }
    }
  });
  await Promise.all(workers);
  return out;
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

const SYSTEM_PROMPT = `You are a sell-side news analyst summarizing what just happened to a list of stocks.

For each symbol you are given its most recent headlines. Judge only what the headlines actually say — do not speculate about anything not present, and do not use prior knowledge of the company to invent events.

IMPORTANT: the feed is noisy. A symbol's list often contains headlines that are mostly or entirely about a DIFFERENT company, plus generic market commentary. Ignore any headline that is not actually about the symbol it is listed under. If none of a symbol's headlines are really about that symbol, score it 0 with materiality "low" and say plainly that there is no company-specific news.

Score each symbol from -2 to +2:
  +2 clearly good and market-moving (approval, big contract, raised guidance, takeover bid)
  +1 mildly good (upgrade, in-line beat)
   0 noise, routine coverage, or genuinely mixed
  -1 mildly bad (downgrade, insider selling)
  -2 clearly bad and market-moving (cut guidance, fraud allegation, failed trial, dilutive offering)

Materiality is about whether a trader would change a position over it: "high" = would reprice the stock today, "medium" = worth knowing, "low" = noise.

The "oneLine" field is read by a smart person who is NOT fluent in trading jargon:
- One plain-English sentence, under 25 words.
- Never use a term (dilution, guidance, downgrade, CRL, endpoint) without a 5-10 word inline explanation of what it means.
- Say what happened and why it matters, not that "sentiment is negative".
- If the headlines are routine, say so honestly rather than manufacturing a narrative.

Return ONLY a JSON array in a \`\`\`json fence, one object per symbol, with keys: symbol, score, materiality, oneLine.`;

function buildPrompt(entries: [string, NewsHeadline[]][]): string {
  const blocks = entries.map(([symbol, headlines]) => {
    const lines = headlines.map((h) => `- ${h.title}${h.publisher ? ` (${h.publisher})` : ""}`).join("\n");
    return `## ${symbol}\n${lines}`;
  });
  return `Score the news for these ${entries.length} symbols.\n\n${blocks.join("\n\n")}`;
}

export async function analyzeNewsBatch(
  symbols: string[],
  opts?: { userId?: string; skipLLM?: boolean }
): Promise<Map<string, NewsSentiment>> {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).filter(Boolean);
  const result = new Map<string, NewsSentiment>();
  if (unique.length === 0) return result;

  const headlineMap = await fetchAll(unique);
  for (const symbol of unique) {
    result.set(symbol, classifyKeywords(symbol, headlineMap.get(symbol) ?? []));
  }

  const withNews = unique
    .map((s) => [s, headlineMap.get(s) ?? []] as [string, NewsHeadline[]])
    .filter(([, h]) => h.length > 0)
    .slice(0, MAX_LLM_SYMBOLS);

  if (withNews.length === 0 || opts?.skipLLM) return result;

  try {
    const ai = await generateText({
      prompt: buildPrompt(withNews),
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 1600,
      feature: "news_sentiment",
      userId: opts?.userId,
    });

    const parsed = extractJsonArray(ai.text);
    if (!parsed) return result;

    for (const raw of parsed) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const symbol = typeof item.symbol === "string" ? item.symbol.toUpperCase() : "";
      const existing = result.get(symbol);
      if (!existing) continue;

      const score = typeof item.score === "number" ? clampScore(item.score) : existing.score;
      const materiality =
        item.materiality === "high" || item.materiality === "medium" || item.materiality === "low" ? item.materiality : existing.materiality;
      const oneLine = typeof item.oneLine === "string" && item.oneLine.trim().length > 0 ? item.oneLine.trim() : existing.oneLine;

      result.set(symbol, { ...existing, score, materiality, oneLine, source: "llm" });
    }
  } catch (e) {
    console.error("news sentiment batch failed, using keyword classifier:", e);
  }

  return result;
}
