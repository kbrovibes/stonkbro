/**
 * What a bot remembers.
 *
 * `notes.ts` writes the day and then forgets it. This is the layer underneath:
 * a small set of earned observations that survive the night and get heavier
 * every time the market repeats them. All of it is derived from the tape — no
 * model writes a line of it, so the same inputs always produce the same memory.
 *
 * Two shapes live side by side. Most kinds accumulate: the same headline seen
 * again bumps `hits` and nudges `weight`. A few are single standing facts — the
 * live streak, the worst scar, what the bot is holding hardest — and get
 * replaced in place, matched on `stats.slot` rather than on their text.
 */

import { tradingDaysBetween } from "./dates";
import { identityFor } from "./identity";
import type { Account, MarkedPosition, Position, Profile, Snapshot, Trade } from "./types";

export type MemoryKind = "creed" | "conviction" | "lesson" | "scar" | "streak" | "milestone";

export interface MemoryEntry {
  profileId: string;
  kind: MemoryKind;
  headline: string;
  detail: string | null;
  weight: number;
  hits: number;
  firstSeen: string;
  lastSeen: string;
  stats: Record<string, unknown>;
}

export interface MemoryInput {
  profile: Profile;
  account: Account;
  /** Today's close snapshot. */
  snapshot: Snapshot;
  /** Every trade this profile made today, across sessions. */
  trades: Trade[];
  closedToday: Position[];
  /** Close equity per day, ascending, including today. */
  series: Array<{ date: string; equity: number }>;
  existing: MemoryEntry[];
}

/** A memory the day proposes. `slot` marks the one-live-instance kinds. */
interface Draft {
  kind: MemoryKind;
  headline: string;
  detail: string | null;
  stats: Record<string, unknown>;
  slot?: string;
  weight?: number;
}

const CREED_WEIGHT = 3;
const MAX_WEIGHT = 5;
const WEIGHT_STEP = 0.25;
const MIN_STREAK = 3;
/** A new high has to clear the old one by a tenth of a percent to count. */
const HIGH_MARGIN = 0.001;
const RETURN_MARKS = [5, 10, -5, -10] as const;
const FEES_MATTER = 100;

const usd = (n: number): string => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const money = (n: number): string => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const pct = (n: number): string => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}%`;
const wholePct = (n: number): string => `${n < 0 ? "−" : "+"}${Math.abs(n)}%`;
const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

function shortDate(d: string): string {
  return new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function sessionsHeld(from: unknown, date: string): number | null {
  if (typeof from !== "string" || from.length < 10) return null;
  return Math.max(1, tradingDaysBetween(from.slice(0, 10), date));
}

function legOf(p: MarkedPosition): string {
  const prefix = p.side === "short" ? "short " : "";
  if (p.kind === "stock") return `${prefix}${p.symbol}`;
  const expiry = p.expiry ? ` ${shortDate(p.expiry)}` : "";
  return `${prefix}${p.symbol} ${p.strike ?? ""}${p.kind === "call" ? "C" : "P"}${expiry}`;
}

function streakDraft(series: MemoryInput["series"]): Draft | null {
  let dir = 0;
  let n = 0;
  for (let i = series.length - 1; i > 0; i--) {
    const step = series[i].equity - series[i - 1].equity;
    if (step === 0) break;
    const s = step > 0 ? 1 : -1;
    if (dir === 0) dir = s;
    else if (s !== dir) break;
    n++;
  }
  if (dir === 0 || n < MIN_STREAK) return null;
  const from = series[series.length - 1 - n];
  const to = series[series.length - 1];
  const delta = to.equity - from.equity;
  return {
    kind: "streak",
    slot: "run",
    headline: `${n} straight ${dir > 0 ? "up" : "down"} closes, ${usd(delta)} across the run.`,
    detail: `Equity ${money(from.equity)} → ${money(to.equity)} since ${shortDate(from.date)}.`,
    stats: { direction: dir > 0 ? "up" : "down", length: n, delta, from: from.date, to: to.date },
  };
}

function milestoneDrafts(input: MemoryInput): Draft[] {
  const { snapshot, series, existing } = input;
  const out: Draft[] = [];
  const best = series.slice(0, -1).reduce<{ date: string; equity: number } | null>(
    (a, p) => (a && a.equity >= p.equity ? a : p),
    null,
  );
  if (best && snapshot.equity > best.equity * (1 + HIGH_MARGIN)) {
    out.push({
      kind: "milestone",
      slot: "equity-high",
      headline: `New equity high at ${money(snapshot.equity)}.`,
      detail: `Beat the old high of ${money(best.equity)}, set ${shortDate(best.date)}.`,
      stats: { equity: snapshot.equity, priorHigh: best.equity, priorHighDate: best.date },
    });
  }
  for (const t of RETURN_MARKS) {
    if (t > 0 ? snapshot.totalReturnPct < t : snapshot.totalReturnPct > t) continue;
    const slot = `return:${t}`;
    if (existing.some((e) => e.kind === "milestone" && e.stats.slot === slot)) continue;
    out.push({
      kind: "milestone",
      slot,
      headline: `Crossed ${wholePct(t)} total return for the first time.`,
      detail: `Equity ${money(snapshot.equity)}, ${pct(snapshot.totalReturnPct)} since the account opened.`,
      stats: { threshold: t, equity: snapshot.equity, totalReturnPct: snapshot.totalReturnPct },
    });
  }
  return out;
}

function scarDraft(input: MemoryInput, date: string): Draft | null {
  const worst = input.closedToday
    .filter((p) => p.realizedPnl < 0)
    .sort((a, b) => a.realizedPnl - b.realizedPnl)[0];
  if (!worst) return null;
  const prev = input.existing.find((e) => e.kind === "scar" && e.stats.slot === "worst-loss");
  const prevLoss = prev ? Number(prev.stats.loss ?? 0) : 0;
  if (worst.realizedPnl >= prevLoss) return null;

  const direction = worst.side === "short" ? -1 : 1;
  const lossPct =
    worst.avgPrice > 0 && worst.closePrice != null
      ? ((worst.closePrice - worst.avgPrice) / worst.avgPrice) * 100 * direction
      : null;
  const held = sessionsHeld(worst.meta.entryDate, date);
  const move = lossPct == null ? "" : ` (${pct(lossPct)})`;
  const tail = held == null ? "" : ` after ${count(held, "session", "sessions")}`;
  const priced = worst.closePrice == null ? null : `In at ${worst.avgPrice.toFixed(2)}, out at ${worst.closePrice.toFixed(2)}.`;
  const beaten = prev ? `Worse than the old scar, ${String(prev.stats.symbol ?? "the one before it")} at ${usd(prevLoss)}.` : null;
  return {
    kind: "scar",
    slot: "worst-loss",
    headline: `Closed ${worst.symbol} for ${usd(worst.realizedPnl)}${move}${tail} — the worst loss yet.`,
    detail: [beaten, priced].filter(Boolean).join(" ") || null,
    stats: { symbol: worst.symbol, loss: worst.realizedPnl, lossPct, sessions: held, closedOn: date },
  };
}

function convictionDrafts(positions: MarkedPosition[], date: string): Draft[] {
  if (positions.length === 0) return [];
  const out: Draft[] = [];
  const oldest = positions.reduce((a, p) => (a.openedAt <= p.openedAt ? a : p));
  const held = sessionsHeld(oldest.openedAt, date);
  out.push({
    kind: "conviction",
    slot: "held-longest",
    headline: `${oldest.symbol} is the longest hold, opened ${shortDate(oldest.openedAt)}${held == null ? "" : ` and carried ${count(held, "session", "sessions")}`}.`,
    detail: `${oldest.qty} ${legOf(oldest)} at ${oldest.avgPrice.toFixed(2)}, marked ${oldest.mark.toFixed(2)} — ${usd(oldest.pnl)} (${pct(oldest.pnlPct)}).`,
    stats: { symbol: oldest.symbol, openedAt: oldest.openedAt, sessions: held, pnl: oldest.pnl, pnlPct: oldest.pnlPct },
  });
  const top = positions.filter((p) => p.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0];
  if (top) {
    out.push({
      kind: "conviction",
      slot: "top-gain",
      headline: `${top.symbol} is the biggest open winner at ${usd(top.pnl)} (${pct(top.pnlPct)}).`,
      detail: `${top.qty} ${legOf(top)} at ${top.avgPrice.toFixed(2)}, marked ${top.mark.toFixed(2)}.`,
      stats: { symbol: top.symbol, pnl: top.pnl, pnlPct: top.pnlPct, openedAt: top.openedAt },
    });
  }
  return out;
}

function lessonDrafts(input: MemoryInput): Draft[] {
  const { account, trades, existing } = input;
  const out: Draft[] = [];
  const rejected = trades.filter((t) => t.status === "rejected").length;
  if (rejected > 0) {
    const headline = "Orders get rejected for buying power — the sizing rule sits right at the ceiling.";
    const before = Number(existing.find((e) => e.kind === "lesson" && e.headline === headline)?.stats.rejected ?? 0);
    out.push({
      kind: "lesson",
      headline,
      detail: `${count(before + rejected, "order", "orders")} rejected so far, ${rejected} today.`,
      stats: { rejected: before + rejected },
    });
  }
  if (account.interest > 0) {
    out.push({
      kind: "lesson",
      headline: "The margin line charges interest every day it is drawn.",
      detail: `$${account.interest.toFixed(2)} paid since ${shortDate(account.startedOn)}.`,
      stats: { interest: account.interest },
    });
  }
  if (account.fees >= FEES_MATTER) {
    out.push({
      kind: "lesson",
      headline: "Commissions are a real line item at this trade count.",
      detail: `$${account.fees.toFixed(2)} in commissions since ${shortDate(account.startedOn)}.`,
      stats: { fees: account.fees },
    });
  }
  return out;
}

function slotKey(kind: MemoryKind, stats: Record<string, unknown>): string | null {
  return typeof stats.slot === "string" ? `${kind}:${stats.slot}` : null;
}

function merge(existing: MemoryEntry[], drafts: Draft[], profileId: string, date: string): MemoryEntry[] {
  const out: MemoryEntry[] = existing.map((e) => ({ ...e, stats: { ...e.stats } }));
  for (const d of drafts) {
    const key = d.slot ? `${d.kind}:${d.slot}` : null;
    const at = key
      ? out.findIndex((e) => slotKey(e.kind, e.stats) === key)
      : out.findIndex((e) => e.kind === d.kind && e.headline === d.headline);
    const stats = d.slot ? { ...d.stats, slot: d.slot } : { ...d.stats };
    if (at < 0) {
      out.push({
        profileId,
        kind: d.kind,
        headline: d.headline,
        detail: d.detail,
        weight: d.weight ?? 1,
        hits: 1,
        firstSeen: date,
        lastSeen: date,
        stats,
      });
      continue;
    }
    const prev = out[at];
    out[at] = {
      ...prev,
      headline: d.headline,
      detail: d.detail,
      hits: prev.hits + 1,
      lastSeen: date,
      weight: Math.min(MAX_WEIGHT, Math.max(prev.weight, d.weight ?? 1) + WEIGHT_STEP),
      stats,
    };
  }
  return out;
}

/** Returns the FULL updated memory set for the profile (existing, merged with what today taught it). */
export function buildMemories(input: MemoryInput, date: string): MemoryEntry[] {
  const { profile, snapshot, existing } = input;
  const drafts: Draft[] = [];
  if (!existing.some((e) => e.kind === "creed")) {
    drafts.push({
      kind: "creed",
      headline: identityFor(profile.id).creed,
      detail: null,
      weight: CREED_WEIGHT,
      stats: { source: "identity" },
    });
  }
  const streak = streakDraft(input.series);
  if (streak) drafts.push(streak);
  drafts.push(...milestoneDrafts(input));
  const scar = scarDraft(input, date);
  if (scar) drafts.push(scar);
  drafts.push(...convictionDrafts(snapshot.positions, date));
  drafts.push(...lessonDrafts(input));
  return merge(existing, drafts, profile.id, date);
}
