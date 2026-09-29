import { generateText } from "@/lib/ai/provider";
import type { EarningsPlayAnalysis, Thesis } from "./types";

const SYSTEM = `You are an options strategist writing the pre-earnings read for one stock. You are given facts: price action, technical signals, recent headlines, the last four reports (EPS surprise and how the stock reacted), what options are pricing, and four already-priced trade structures.

Rules:
- Use only the facts given. Never invent numbers, dates, guidance, or events. If a headline isn't about this company, ignore it.
- Be specific and plain. No hype, no emojis, no disclaimers.
- Return ONLY JSON: {"read": string, "watch": string[], "risks": string[]}
  - read: 3–4 sentences, under 90 words — what the setup looks like going into the print and which of the four structures fits it best, and why.
  - watch: 2–3 short items to watch in the report or the reaction.
  - risks: 2–3 short items that would break the thesis.`;

function facts(a: EarningsPlayAnalysis) {
  return {
    symbol: a.symbol,
    name: a.name,
    price: a.spot,
    reports: `${a.earningsDate}${a.timingLabel ? ` ${a.timingLabel}` : ""}`,
    impliedMovePct: +a.impliedMovePct.toFixed(1),
    ivFrontPct: Math.round(a.vol.frontIv * 100),
    ivAfterPct: Math.round(a.vol.baseIv * 100),
    lastReports: a.pastReactions.map((r) => ({
      reported: r.reportDate, reactionPct: +r.movePct.toFixed(1),
      epsSurprisePct: r.surprisePct, source: r.source,
    })),
    premiumVsHistory: a.regime,
    lean: a.bias,
    leanScore: +a.biasScore.toFixed(2),
    leanDrivers: a.drivers.map((d) => d.label),
    technicals: a.technicals,
    headlines: a.news.headlines.map((h) => `${h.title}${h.publisher ? ` (${h.publisher})` : ""}`),
    structures: a.strategies.map((s) => ({
      name: s.name, trade: s.summary, bestFit: s.bestFit,
      up5to10: [Math.round(s.band.up.min), Math.round(s.band.up.max)],
      down5to10: [Math.round(s.band.down.min), Math.round(s.band.down.max)],
      maxLoss: Math.round(s.maxLossAtExpiry),
    })),
  };
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()).slice(0, 3) : [];
}

/** One model call. Null on any failure — the page renders without it. */
export async function writeThesis(a: EarningsPlayAnalysis, userId?: string): Promise<Thesis | null> {
  try {
    const res = await generateText({
      prompt: `Facts:\n${JSON.stringify(facts(a))}`,
      systemPrompt: SYSTEM,
      maxTokens: 700,
      feature: "earnings-play",
      userId,
    });
    const start = res.text.indexOf("{");
    const end = res.text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(res.text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof parsed.read !== "string" || !parsed.read.trim()) return null;
    return { read: parsed.read.trim(), watch: strings(parsed.watch), risks: strings(parsed.risks) };
  } catch (e) {
    console.error("[earnings-play] thesis failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
