/**
 * Daily audio briefing pipeline: gather portfolio + market context, have the
 * AI write a spoken script, synthesize it, store transcript + MP3.
 */
import { generateText } from "@/lib/ai/provider";
import { getRecentAlerts } from "@/lib/db/alerts";
import {
  completeBriefing,
  deleteUnfinishedBriefingsForDate,
  failBriefing,
  getBriefingById,
  insertBriefing,
  uploadBriefingAudio,
} from "@/lib/db/briefings";
import { getLatestChainScan } from "@/lib/db/portfolio-chain-scans";
import type { JobContext } from "@/lib/jobs/tracker";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { getQuotes } from "@/lib/market/yahoo";
import { getRecentHeadlines } from "@/lib/market/yahoo-news";
import { getPortfolio, type OptionChain } from "@/lib/snaptrade/client";
import { synthesizeBriefing } from "./tts";
import {
  BRIEFING_SESSIONS,
  BRIEFING_VOICE,
  type BriefingScript,
  type BriefingSession,
  type BriefingTrigger,
  type DailyBriefing,
} from "./types";

/** Today's date (YYYY-MM-DD) in market time, not server UTC. */
export function marketDateToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

const NEWS_SYMBOL_CAP = 10;

type GatheredContext = {
  openChains: OptionChain[];
  holdings: { symbol: string; units: number; pnlPct: number }[];
  quotes: { symbol: string; price: number; changePct: number }[];
  news: { symbol: string; title: string; publisher?: string; published_at: string }[];
  earnings: { symbol: string; earningsDate: string; daysUntil: number; timing: string }[];
  alerts: { severity: string; symbol: string | null; title: string; body: string }[];
};

async function gatherContext(): Promise<GatheredContext> {
  const [chainsRes, portfolioRes] = await Promise.allSettled([getLatestChainScan(48), getPortfolio()]);

  const openChains =
    chainsRes.status === "fulfilled"
      ? (chainsRes.value?.chains ?? []).filter((c) => c.status === "OPEN")
      : [];

  const holdings =
    portfolioRes.status === "fulfilled"
      ? portfolioRes.value.positions
          .filter((p) => p.symbol && p.symbol !== "UNKNOWN" && !p.is_option)
          .map((p) => ({ symbol: p.symbol, units: p.units, pnlPct: p.unrealized_pnl_pct }))
      : [];

  const symbols = new Set<string>();
  for (const h of holdings) symbols.add(h.symbol);
  for (const c of openChains) if (c.underlying !== "UNKNOWN") symbols.add(c.underlying);
  if (portfolioRes.status === "fulfilled") {
    for (const o of portfolioRes.value.options) if (o.underlying !== "UNKNOWN") symbols.add(o.underlying);
  }
  const portfolioSymbols = [...symbols];

  const [quotesRes, earningsRes, alertsRes] = await Promise.allSettled([
    getQuotes([...new Set([...portfolioSymbols, "SPY", "QQQ"])]),
    portfolioSymbols.length > 0 ? getEarningsCalendar(portfolioSymbols) : Promise.resolve([]),
    getRecentAlerts(24),
  ]);

  // Yahoo news has an internal 30-min cache; fetch market-level first, then a
  // capped set of portfolio symbols. All best-effort.
  const news: GatheredContext["news"] = [];
  const newsSymbols = ["SPY", ...portfolioSymbols.slice(0, NEWS_SYMBOL_CAP)];
  const perSymbol = await Promise.allSettled(
    newsSymbols.map(async (s) => ({
      symbol: s,
      headlines: await getRecentHeadlines(s, s === "SPY" ? 5 : 3),
    }))
  );
  for (const r of perSymbol) {
    if (r.status !== "fulfilled") continue;
    for (const h of r.value.headlines) {
      news.push({ symbol: r.value.symbol, title: h.title, publisher: h.publisher, published_at: h.published_at });
    }
  }

  return {
    openChains,
    holdings,
    quotes:
      quotesRes.status === "fulfilled"
        ? quotesRes.value.map((q) => ({ symbol: q.symbol, price: q.price, changePct: q.changePct }))
        : [],
    news,
    earnings:
      earningsRes.status === "fulfilled"
        ? earningsRes.value
            .filter((e) => e.daysUntil >= 0 && e.daysUntil <= 7)
            .map((e) => ({ symbol: e.symbol, earningsDate: e.earningsDate, daysUntil: e.daysUntil, timing: e.timing }))
        : [],
    alerts:
      alertsRes.status === "fulfilled"
        ? alertsRes.value.map((a) => ({ severity: a.severity, symbol: a.symbol, title: a.title, body: a.body }))
        : [],
  };
}

function chainSummary(c: OptionChain): Record<string, unknown> {
  const lastLeg = c.legs[c.legs.length - 1];
  return {
    underlying: c.underlying,
    type: c.option_type,
    direction: c.direction === "SELL" ? "short (income)" : "long",
    contracts: Math.abs(c.open_units),
    strike: lastLeg?.strike,
    expiry: lastLeg?.expiry,
    rolls: c.roll_count,
    net_pnl_so_far: Math.round(c.net_pnl),
    brokerage: c.institution ?? null,
  };
}

const SYSTEM_PROMPT = `You write a personal audio market briefing for one busy options trader who runs PMCC, covered-call, and cash-secured-put strategies. You are given their actual open positions, holdings, quotes, headlines, earnings dates, app alerts, and which of the day's three episodes this is (session_guidance says what this episode should cover).

NON-NEGOTIABLE: if SPY or QQQ has moved more than 1.5% in either direction, that IS the story — open with it, state the magnitude plainly ("the market is selling off hard, SPY down three point one percent"), connect it to their positions, and set the mood accordingly. Never bury or soften an index-level shock.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "title": string,        // punchy headline, max 60 chars, e.g. "NVDA rips — roll the SOFI puts"
  "summary": string,      // 1-2 sentence teaser for the home card
  "transcript": string,   // the full spoken script
  "highlights": [{ "symbol": string, "changePct": number|null, "direction": "up"|"down"|"flat", "note": string }],
  "actions": [{ "kind": "close"|"open"|"roll"|"watch"|"hold", "symbol": string, "detail": string }],
  "mood": "up"|"down"|"mixed"|"quiet"
}

Transcript rules — it is fed directly to text-to-speech:
- Spoken prose only. No markdown, no headers, no bullet characters, no URLs.
- 350-500 words, crisp and conversational, medium-fast radio pacing. Address the listener as "you".
- Say percentages in words ("up four point two percent"), never "%" glued to digits like "4.2%-ish".
- NEVER state account-level or position-level dollar amounts. Percentages and generic per-contract premium talk only (privacy).
- Structure: one-breath market tone (SPY/QQQ) -> biggest moves in THEIR portfolio and why -> news and earnings that matter for THEIR names -> concrete suggestions (close, roll, open, watch — each with one plain reason, referencing their actual open positions) -> one-line signoff. Bend the content to session_guidance.
- If a data section is empty, skip it gracefully — never say "no data available".
- Only suggest closing/rolling positions that actually appear in open_chains. Suggesting nothing is fine on a quiet day: say so and keep it short.`;

function buildPrompt(dateISO: string, session: BriefingSession, ctx: GatheredContext): string {
  return JSON.stringify(
    {
      briefing_date: dateISO,
      session,
      session_guidance: BRIEFING_SESSIONS[session].focus,
      day_of_week: new Date(`${dateISO}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long" }),
      open_chains: ctx.openChains.map(chainSummary),
      stock_holdings: ctx.holdings.map((h) => ({ symbol: h.symbol, unrealized_pnl_pct: Math.round(h.pnlPct * 10) / 10 })),
      latest_quotes: ctx.quotes,
      headlines: ctx.news,
      earnings_next_7d: ctx.earnings,
      alerts_last_24h: ctx.alerts,
    },
    null,
    1
  );
}

function parseScript(raw: string): BriefingScript | null {
  const stripped = raw.replace(/```(?:json)?/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(stripped.slice(start, end + 1)) as BriefingScript;
    if (!obj.transcript || !obj.title) return null;
    return {
      title: String(obj.title).slice(0, 80),
      summary: String(obj.summary ?? ""),
      transcript: String(obj.transcript),
      highlights: Array.isArray(obj.highlights) ? obj.highlights : [],
      actions: Array.isArray(obj.actions) ? obj.actions : [],
      mood: (["up", "down", "mixed", "quiet"] as const).includes(obj.mood) ? obj.mood : "mixed",
    };
  } catch {
    return null;
  }
}

/** Which episode a generation started right now belongs to, by Eastern time. */
export function sessionForNow(): BriefingSession {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const mins = h * 60 + m;
  if (mins < 9 * 60 + 30) return "premarket";
  if (mins < 16 * 60) return "midday";
  return "close";
}

export async function generateDailyBriefing(opts: {
  trigger: BriefingTrigger;
  session?: BriefingSession;
  ctx?: JobContext;
}): Promise<DailyBriefing> {
  const dateISO = marketDateToday();
  const session = opts.session ?? sessionForNow();
  const id = await insertBriefing(opts.trigger, dateISO, session);

  try {
    await opts.ctx?.progress("Gathering market data…");
    const context = await gatherContext();
    await opts.ctx?.checkCancelled();

    await opts.ctx?.progress("Writing script…");
    const prompt = buildPrompt(dateISO, session, context);
    let result = await generateText({
      prompt,
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 3000,
      feature: "daily-briefing",
    });
    let script = parseScript(result.text);
    if (!script) {
      result = await generateText({
        prompt: `${prompt}\n\nYour previous reply was not parseable. Return ONLY the JSON object, nothing else.`,
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 3000,
        feature: "daily-briefing",
      });
      script = parseScript(result.text);
    }
    if (!script) throw new Error("AI returned unparseable briefing JSON twice");
    await opts.ctx?.checkCancelled();

    await opts.ctx?.progress("Synthesizing audio…");
    let audioPath: string | null = null;
    let audioBytes: number | null = null;
    let audioDurationS: number | null = null;
    let ttsError: string | null = null;
    try {
      const { buffer, durationS } = await synthesizeBriefing(script.transcript);
      audioPath = `${dateISO}/${id}.mp3`;
      await uploadBriefingAudio(audioPath, buffer);
      audioBytes = buffer.length;
      audioDurationS = Math.round(durationS);
    } catch (e) {
      // Transcript-only briefing still beats no briefing.
      ttsError = `TTS failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error("[Briefing]", ttsError);
    }

    await completeBriefing(id, {
      title: script.title,
      summary: script.summary,
      transcript: script.transcript,
      highlights: script.highlights,
      actions: script.actions,
      mood: script.mood,
      audio_path: audioPath,
      audio_bytes: audioBytes,
      audio_duration_s: audioDurationS,
      voice: audioPath ? BRIEFING_VOICE : null,
      error_message: ttsError,
    });
    await deleteUnfinishedBriefingsForDate(dateISO, id);

    const saved = await getBriefingById(id);
    if (!saved) throw new Error("briefing row vanished after completion");
    return saved;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      await failBriefing(id, message);
    } catch {
      // best effort
    }
    throw e;
  }
}
