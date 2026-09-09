import { generateText } from "@/lib/ai/provider";
import type { Account, Profile, ProfileNote, Snapshot, Trade } from "./types";
import { START_CASH } from "./types";

export interface NoteInput {
  profile: Profile;
  account: Account;
  snapshot: Snapshot;
  /** Every trade the profile made today, across sessions. */
  trades: Trade[];
}

const usd = (n: number): string => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const pct = (n: number): string => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}%`;

function shortDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function describe(t: Trade): string {
  const leg = t.kind === "call" || t.kind === "put" ? ` ${t.strike}${t.kind === "call" ? "C" : "P"} ${t.expiry ? shortDate(t.expiry) : ""}` : "";
  switch (t.action) {
    case "buy":
      return `Bought ${t.qty} ${t.symbol}${leg} @ ${t.price.toFixed(2)} — ${t.reason}`;
    case "sell":
      return `Sold ${t.qty} ${t.symbol}${leg} @ ${t.price.toFixed(2)} — ${t.reason}`;
    case "reject":
      return `Rejected ${t.symbol}${leg}: ${t.reason}`;
    case "interest":
      return t.reason;
    default:
      return t.reason;
  }
}

function priority(t: Trade): number {
  if (t.action === "assign" || t.action === "called_away") return 0;
  if (t.action === "reject") return 1;
  if (t.action === "settle" || t.action === "expire") return 2;
  if (t.action === "interest") return 4;
  return 3;
}

export function buildProfileNote(input: NoteInput, date: string): ProfileNote {
  const { snapshot, trades, account } = input;
  const dayPct = snapshot.equity - snapshot.dayPnl > 0 ? (snapshot.dayPnl / (snapshot.equity - snapshot.dayPnl)) * 100 : 0;
  const highlights: string[] = [`Day ${usd(snapshot.dayPnl)} (${pct(dayPct)}) · total ${pct(snapshot.totalReturnPct)}`];
  const ranked = [...trades].sort((a, b) => priority(a) - priority(b) || Math.abs(b.amount) - Math.abs(a.amount));
  for (const t of ranked.slice(0, 6)) highlights.push(describe(t));
  if (trades.length > 6) highlights.push(`…and ${trades.length - 6} more trades`);
  if (trades.length === 0) highlights.push(`No trades — holding ${snapshot.positions.length} position${snapshot.positions.length === 1 ? "" : "s"}`);

  const learnings: string[] = [];
  const open = [...snapshot.positions].sort((a, b) => b.pnlPct - a.pnlPct);
  if (open.length > 0) {
    const best = open[0];
    const worst = open[open.length - 1];
    learnings.push(`Best open: ${best.symbol} ${pct(best.pnlPct)} (${usd(best.pnl)})`);
    if (worst !== best) learnings.push(`Worst open: ${worst.symbol} ${pct(worst.pnlPct)} (${usd(worst.pnl)})`);
  }
  const deployed = snapshot.equity > 0 ? ((snapshot.equity - Math.max(0, snapshot.cash)) / snapshot.equity) * 100 : 0;
  learnings.push(`${Math.max(0, Math.min(100, deployed)).toFixed(0)}% of equity deployed, $${Math.round(Math.max(0, snapshot.cash)).toLocaleString("en-US")} cash`);
  if (snapshot.cash < 0) {
    learnings.push(`Borrowing $${Math.round(-snapshot.cash).toLocaleString("en-US")} · $${account.interest.toFixed(2)} interest paid to date`);
  }
  const shorts = snapshot.positions.filter((p) => p.side === "short");
  if (shorts.length > 0) learnings.push(`${shorts.length} short option${shorts.length === 1 ? "" : "s"} · $${Math.round(snapshot.marginUsed).toLocaleString("en-US")} margin held`);
  const rejected = trades.filter((t) => t.status === "rejected").length;
  if (rejected > 0) learnings.push(`${rejected} order${rejected === 1 ? "" : "s"} rejected for buying power — sizing is at the limit`);
  if (account.fees > 0) learnings.push(`$${account.fees.toFixed(2)} in commissions since start`);

  return {
    profileId: input.profile.id,
    noteDate: date,
    highlights,
    learnings,
    narrative: null,
    stats: {
      equity: snapshot.equity,
      cash: snapshot.cash,
      dayPnl: snapshot.dayPnl,
      dayPct,
      totalReturnPct: snapshot.totalReturnPct,
      trades: trades.length,
      rejected,
      positions: snapshot.positions.length,
    },
  };
}

export function buildDeskNote(notes: ProfileNote[], profiles: Profile[], date: string): ProfileNote {
  const name = (id: string | null) => profiles.find((p) => p.id === id)?.name ?? id ?? "";
  const byDay = [...notes].sort((a, b) => Number(b.stats.dayPnl ?? 0) - Number(a.stats.dayPnl ?? 0));
  const totalEquity = notes.reduce((s, n) => s + Number(n.stats.equity ?? 0), 0);
  const totalDay = notes.reduce((s, n) => s + Number(n.stats.dayPnl ?? 0), 0);
  const start = START_CASH * notes.length;
  const highlights = [
    `Desk ${usd(totalDay)} on the day · ${usd(totalEquity - start)} (${pct(start > 0 ? ((totalEquity - start) / start) * 100 : 0)}) since start`,
  ];
  if (byDay.length > 0) {
    const lead = byDay[0];
    const lag = byDay[byDay.length - 1];
    highlights.push(`Leader: ${name(lead.profileId)} ${usd(Number(lead.stats.dayPnl))} (${pct(Number(lead.stats.dayPct))})`);
    if (lag !== lead) highlights.push(`Laggard: ${name(lag.profileId)} ${usd(Number(lag.stats.dayPnl))} (${pct(Number(lag.stats.dayPct))})`);
  }
  const traded = notes.filter((n) => Number(n.stats.trades) > 0).length;
  const rejected = notes.reduce((s, n) => s + Number(n.stats.rejected ?? 0), 0);
  const learnings = [`${traded} of ${notes.length} bots traded today${rejected ? ` · ${rejected} rejected orders` : ""}`];
  const byTotal = [...notes].sort((a, b) => Number(b.stats.totalReturnPct) - Number(a.stats.totalReturnPct));
  if (byTotal.length > 0) learnings.push(`Ranking by total return: ${byTotal.slice(0, 3).map((n) => `${name(n.profileId)} ${pct(Number(n.stats.totalReturnPct))}`).join(", ")}`);
  return {
    profileId: null,
    noteDate: date,
    highlights,
    learnings,
    narrative: null,
    stats: { equity: totalEquity, dayPnl: totalDay, totalPnl: totalEquity - start, bots: notes.length, traded, rejected },
  };
}

const SYSTEM = `You write end-of-day notes for a paper-trading desk of ten rule-based bots. Each bot follows a fixed written plan; you never invent trades or numbers — use only the facts given. Plain, specific, a little dry. No emojis, no headers, no bullet points. Return ONLY JSON.`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON in response");
  return JSON.parse(text.slice(start, end + 1));
}

/** One batched call; on any failure the notes come back unchanged (narrative null). */
export async function addNarratives(
  notes: ProfileNote[],
  desk: ProfileNote,
  profiles: Profile[],
  date: string,
): Promise<{ notes: ProfileNote[]; desk: ProfileNote }> {
  const payload = {
    date,
    desk: { highlights: desk.highlights, learnings: desk.learnings },
    profiles: notes.map((n) => {
      const p = profiles.find((x) => x.id === n.profileId);
      return { id: n.profileId, name: p?.name, plan: p?.tagline, highlights: n.highlights, learnings: n.learnings };
    }),
  };
  const prompt = `Facts for ${date}:\n${JSON.stringify(payload)}\n\nWrite one narrative (2–3 sentences, under 60 words) per profile explaining what its rules did today and why, and one desk narrative (under 120 words) comparing the bots. Output exactly: {"profiles":[{"id":"...","narrative":"..."}],"desk":"..."}`;
  try {
    const res = await generateText({ prompt, systemPrompt: SYSTEM, maxTokens: 1200, feature: "paper-notes" });
    const parsed = extractJson(res.text) as { profiles?: Array<{ id?: string; narrative?: string }>; desk?: string };
    const byId = new Map<string, string>();
    for (const p of parsed.profiles ?? []) {
      if (typeof p.id === "string" && typeof p.narrative === "string" && p.narrative.trim()) byId.set(p.id, p.narrative.trim());
    }
    return {
      notes: notes.map((n) => ({ ...n, narrative: byId.get(n.profileId ?? "") ?? null })),
      desk: { ...desk, narrative: typeof parsed.desk === "string" && parsed.desk.trim() ? parsed.desk.trim() : null },
    };
  } catch (e) {
    console.error("[paper] narratives failed:", e instanceof Error ? e.message : e);
    return { notes, desk };
  }
}
