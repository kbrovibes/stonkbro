import { supabaseAdmin } from "@/lib/supabase";
import { addDays, etToday } from "@/lib/paper/dates";
import type { MemoryEntry } from "@/lib/paper/memory";
import type { Account, Position, Profile, ProfileNote, Session, Snapshot, Trade } from "@/lib/paper/types";
import { MARGIN_LIMIT, SESSION_ORDER, START_CASH } from "@/lib/paper/types";

/* -- row shapes ---------------------------------------------------------- */

export interface ProfileRow {
  id: string;
  name: string;
  tagline: string;
  style: string[];
  plan: string[];
  params: Record<string, unknown>;
  universe: string[];
}

interface AccountRow {
  profile_id: string;
  cash: number;
  margin_limit: number;
  realized_pnl: number;
  fees: number;
  interest: number;
  started_on: string;
  state: Record<string, unknown> | null;
}

interface PositionRow {
  id: string;
  profile_id: string;
  symbol: string;
  kind: Position["kind"];
  side: Position["side"];
  qty: number;
  strike: number | null;
  expiry: string | null;
  avg_price: number;
  opened_at: string;
  closed_at: string | null;
  close_price: number | null;
  realized_pnl: number;
  status: Position["status"];
  meta: Position["meta"] | null;
}

export interface SnapshotRow {
  profile_id: string;
  snap_date: string;
  session: Session;
  equity: number;
  cash: number;
  margin_used: number;
  positions_value: number;
  day_pnl: number;
  total_pnl: number;
  total_return_pct: number;
  positions: Snapshot["positions"];
}

export interface TradeRow {
  id: string;
  profile_id: string;
  ts: string;
  trade_date: string;
  session: Session;
  symbol: string;
  kind: string;
  action: string;
  qty: number;
  price: number;
  strike: number | null;
  expiry: string | null;
  amount: number;
  fees: number;
  reason: string;
  position_id: string | null;
  status: string;
}

export interface NoteRow {
  profile_id: string | null;
  note_date: string;
  highlights: string[];
  learnings: string[];
  narrative: string | null;
  stats: Record<string, unknown>;
}

export interface MemoryRow {
  id: string;
  profile_id: string;
  kind: MemoryEntry["kind"];
  headline: string;
  detail: string | null;
  weight: number;
  hits: number;
  first_seen: string;
  last_seen: string;
  stats: Record<string, unknown> | null;
}

export interface RunRow {
  id: string;
  run_date: string;
  session: Session;
  started_at: string;
  finished_at: string | null;
  status: string;
  log: Record<string, unknown> | null;
}

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));

function toAccount(r: AccountRow): Account {
  return {
    profileId: r.profile_id,
    cash: num(r.cash),
    marginLimit: num(r.margin_limit),
    realizedPnl: num(r.realized_pnl),
    fees: num(r.fees),
    interest: num(r.interest),
    startedOn: r.started_on,
    state: r.state ?? {},
  };
}

function toPosition(r: PositionRow): Position {
  return {
    id: r.id,
    profileId: r.profile_id,
    symbol: r.symbol,
    kind: r.kind,
    side: r.side,
    qty: num(r.qty),
    strike: r.strike == null ? null : num(r.strike),
    expiry: r.expiry,
    avgPrice: num(r.avg_price),
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    closePrice: r.close_price == null ? null : num(r.close_price),
    realizedPnl: num(r.realized_pnl),
    status: r.status,
    meta: r.meta ?? {},
  };
}

function toMemory(r: MemoryRow): MemoryEntry {
  return {
    profileId: r.profile_id,
    kind: r.kind,
    headline: r.headline,
    detail: r.detail,
    weight: num(r.weight),
    hits: num(r.hits),
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    stats: r.stats ?? {},
  };
}

function fail(what: string, error: { message: string } | null): void {
  if (error) throw new Error(`paper db ${what}: ${error.message}`);
}

/* -- profiles + accounts --------------------------------------------------- */

export async function upsertProfiles(profiles: Profile[]): Promise<void> {
  const { error } = await supabaseAdmin.from("paper_profiles").upsert(
    profiles.map((p) => ({
      id: p.id, name: p.name, tagline: p.tagline, style: p.style, plan: p.plan,
      params: { ...p.params, margin: p.margin }, universe: p.universe,
    })),
    { onConflict: "id" },
  );
  fail("upsertProfiles", error);
}

export async function listProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabaseAdmin.from("paper_profiles").select("*");
  fail("listProfiles", error);
  return (data ?? []) as ProfileRow[];
}

export async function getAccounts(): Promise<Map<string, Account>> {
  const { data, error } = await supabaseAdmin.from("paper_accounts").select("*");
  fail("getAccounts", error);
  return new Map(((data ?? []) as AccountRow[]).map((r) => [r.profile_id, toAccount(r)]));
}

export async function ensureAccounts(profileIds: string[], startedOn: string): Promise<Map<string, Account>> {
  const existing = await getAccounts();
  const missing = profileIds.filter((id) => !existing.has(id));
  if (missing.length > 0) {
    const { error } = await supabaseAdmin.from("paper_accounts").insert(
      missing.map((profile_id) => ({
        profile_id, cash: START_CASH, margin_limit: MARGIN_LIMIT, realized_pnl: 0, fees: 0, interest: 0,
        started_on: startedOn, state: {},
      })),
    );
    fail("ensureAccounts", error);
    return getAccounts();
  }
  return existing;
}

export async function saveAccount(a: Account): Promise<void> {
  const { error } = await supabaseAdmin
    .from("paper_accounts")
    .update({
      cash: a.cash, realized_pnl: a.realizedPnl, fees: a.fees, interest: a.interest,
      state: a.state, updated_at: new Date().toISOString(),
    })
    .eq("profile_id", a.profileId);
  fail("saveAccount", error);
}

/* -- positions + trades ---------------------------------------------------- */

export async function getOpenPositions(): Promise<Position[]> {
  const { data, error } = await supabaseAdmin.from("paper_positions").select("*").eq("status", "open");
  fail("getOpenPositions", error);
  return ((data ?? []) as PositionRow[]).map(toPosition);
}

export async function upsertPositions(positions: Position[]): Promise<void> {
  if (positions.length === 0) return;
  const rows = positions.map((p) => ({
    id: p.id, profile_id: p.profileId, symbol: p.symbol, kind: p.kind, side: p.side, qty: p.qty,
    strike: p.strike, expiry: p.expiry, avg_price: p.avgPrice, opened_at: p.openedAt, closed_at: p.closedAt,
    close_price: p.closePrice, realized_pnl: p.realizedPnl, status: p.status, meta: p.meta,
  }));
  const { error } = await supabaseAdmin.from("paper_positions").upsert(rows, { onConflict: "id" });
  fail("upsertPositions", error);
}

export async function insertTrades(trades: Trade[]): Promise<void> {
  if (trades.length === 0) return;
  const rows = trades.map((t) => ({
    id: t.id, profile_id: t.profileId, ts: t.ts, trade_date: t.tradeDate, session: t.session, symbol: t.symbol,
    kind: t.kind, action: t.action, qty: t.qty, price: t.price, strike: t.strike, expiry: t.expiry,
    amount: t.amount, fees: t.fees, reason: t.reason, position_id: t.positionId, status: t.status,
  }));
  const { error } = await supabaseAdmin.from("paper_trades").insert(rows);
  fail("insertTrades", error);
}

export async function getTradesFor(profileId: string, date: string): Promise<TradeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("paper_trades").select("*").eq("profile_id", profileId).eq("trade_date", date).order("ts", { ascending: true });
  fail("getTradesFor", error);
  return (data ?? []) as TradeRow[];
}

export async function getTradesOnDate(date: string): Promise<TradeRow[]> {
  const { data, error } = await supabaseAdmin.from("paper_trades").select("*").eq("trade_date", date).order("ts");
  fail("getTradesOnDate", error);
  return (data ?? []) as TradeRow[];
}

export async function getClosedTradeStats(profileId: string): Promise<{ wins: number; losses: number }> {
  const { data, error } = await supabaseAdmin
    .from("paper_positions").select("realized_pnl").eq("profile_id", profileId).eq("status", "closed");
  fail("getClosedTradeStats", error);
  const rows = (data ?? []) as Array<{ realized_pnl: number }>;
  return { wins: rows.filter((r) => num(r.realized_pnl) > 0).length, losses: rows.filter((r) => num(r.realized_pnl) <= 0).length };
}

/* -- snapshots --------------------------------------------------------------- */

export async function upsertSnapshots(snaps: Snapshot[]): Promise<void> {
  if (snaps.length === 0) return;
  const rows = snaps.map((s) => ({
    profile_id: s.profileId, snap_date: s.snapDate, session: s.session, equity: s.equity, cash: s.cash,
    margin_used: s.marginUsed, positions_value: s.positionsValue, day_pnl: s.dayPnl, total_pnl: s.totalPnl,
    total_return_pct: s.totalReturnPct, positions: s.positions,
  }));
  const { error } = await supabaseAdmin.from("paper_snapshots").upsert(rows, { onConflict: "profile_id,snap_date,session" });
  fail("upsertSnapshots", error);
}

/** Equity at the most recent close strictly before `date`, per profile. */
export async function getPreviousCloseEquity(date: string): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from("paper_snapshots").select("profile_id, equity, snap_date")
    .eq("session", "close").lt("snap_date", date).order("snap_date", { ascending: false }).limit(200);
  fail("getPreviousCloseEquity", error);
  const out = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ profile_id: string; equity: number }>) {
    if (!out.has(r.profile_id)) out.set(r.profile_id, num(r.equity));
  }
  return out;
}

/** The newest snapshot per profile (latest date, then latest session). */
export async function getLatestSnapshots(): Promise<Map<string, SnapshotRow>> {
  const { data, error } = await supabaseAdmin
    .from("paper_snapshots").select("*").order("snap_date", { ascending: false }).limit(60);
  fail("getLatestSnapshots", error);
  const out = new Map<string, SnapshotRow>();
  for (const r of (data ?? []) as SnapshotRow[]) {
    const cur = out.get(r.profile_id);
    if (!cur || r.snap_date > cur.snap_date || (r.snap_date === cur.snap_date && SESSION_ORDER[r.session] > SESSION_ORDER[cur.session])) {
      out.set(r.profile_id, r);
    }
  }
  return out;
}

export async function getSnapshotFor(profileId: string, date: string): Promise<SnapshotRow | null> {
  const { data, error } = await supabaseAdmin
    .from("paper_snapshots").select("*").eq("profile_id", profileId).eq("snap_date", date);
  fail("getSnapshotFor", error);
  const rows = (data ?? []) as SnapshotRow[];
  rows.sort((a, b) => SESSION_ORDER[b.session] - SESSION_ORDER[a.session]);
  return rows[0] ?? null;
}

export interface SeriesPoint { date: string; equity: number }

/** Close-session equity per profile, oldest first, at most `n` points each. */
export async function getCloseSeries(n = 40, profileId?: string): Promise<Map<string, SeriesPoint[]>> {
  let q = supabaseAdmin
    .from("paper_snapshots").select("profile_id, snap_date, equity").eq("session", "close")
    .order("snap_date", { ascending: false }).limit(profileId ? n : n * 10);
  if (profileId) q = q.eq("profile_id", profileId);
  const { data, error } = await q;
  fail("getCloseSeries", error);
  const out = new Map<string, SeriesPoint[]>();
  for (const r of (data ?? []) as Array<{ profile_id: string; snap_date: string; equity: number }>) {
    const list = out.get(r.profile_id) ?? [];
    if (list.length < n) list.push({ date: r.snap_date, equity: num(r.equity) });
    out.set(r.profile_id, list);
  }
  for (const list of out.values()) list.reverse();
  return out;
}

export async function getAvailableDates(profileId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("paper_snapshots").select("snap_date").eq("profile_id", profileId)
    .order("snap_date", { ascending: false }).limit(400);
  fail("getAvailableDates", error);
  return [...new Set(((data ?? []) as Array<{ snap_date: string }>).map((r) => r.snap_date))];
}

/* -- notes ------------------------------------------------------------------- */

export async function upsertNotes(notes: ProfileNote[]): Promise<void> {
  if (notes.length === 0) return;
  const desk = notes.find((n) => n.profileId === null);
  if (desk) {
    const { error } = await supabaseAdmin.from("paper_notes").delete().is("profile_id", null).eq("note_date", desk.noteDate);
    fail("upsertNotes(desk)", error);
  }
  const rows = notes.map((n) => ({
    profile_id: n.profileId, note_date: n.noteDate, highlights: n.highlights, learnings: n.learnings,
    narrative: n.narrative, stats: n.stats,
  }));
  const { error } = await supabaseAdmin.from("paper_notes").upsert(rows, { onConflict: "profile_id,note_date" });
  fail("upsertNotes", error);
}

export async function getNoteFor(profileId: string | null, date: string): Promise<NoteRow | null> {
  let q = supabaseAdmin.from("paper_notes").select("*").eq("note_date", date);
  q = profileId ? q.eq("profile_id", profileId) : q.is("profile_id", null);
  const { data, error } = await q.limit(1);
  fail("getNoteFor", error);
  return ((data ?? []) as NoteRow[])[0] ?? null;
}

export async function getLatestDeskNote(): Promise<NoteRow | null> {
  const { data, error } = await supabaseAdmin
    .from("paper_notes").select("*").is("profile_id", null).order("note_date", { ascending: false }).limit(1);
  fail("getLatestDeskNote", error);
  return ((data ?? []) as NoteRow[])[0] ?? null;
}

/* -- runs --------------------------------------------------------------------- */

export async function getRun(date: string, session: Session): Promise<RunRow | null> {
  const { data, error } = await supabaseAdmin
    .from("paper_runs").select("*").eq("run_date", date).eq("session", session).limit(1);
  fail("getRun", error);
  return ((data ?? []) as RunRow[])[0] ?? null;
}

export async function startRun(date: string, session: Session): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("paper_runs")
    .upsert({ run_date: date, session, started_at: new Date().toISOString(), finished_at: null, status: "running", log: {} },
      { onConflict: "run_date,session" })
    .select("id").single();
  fail("startRun", error);
  return (data as { id: string }).id;
}

export async function patchRunLog(id: string, log: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin.from("paper_runs").update({ log }).eq("id", id);
  fail("patchRunLog", error);
}

export async function finishRun(id: string, status: string, log: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin
    .from("paper_runs").update({ status, finished_at: new Date().toISOString(), log }).eq("id", id);
  fail("finishRun", error);
}

export async function getCompletedRunsSince(date: string): Promise<RunRow[]> {
  const { data, error } = await supabaseAdmin
    .from("paper_runs").select("*").eq("status", "completed").gte("run_date", date).order("run_date");
  fail("getCompletedRunsSince", error);
  return (data ?? []) as RunRow[];
}

export async function getLastRun(): Promise<RunRow | null> {
  const { data, error } = await supabaseAdmin
    .from("paper_runs").select("*").order("started_at", { ascending: false }).limit(1);
  fail("getLastRun", error);
  return ((data ?? []) as RunRow[])[0] ?? null;
}

/* -- memory ------------------------------------------------------------------- */

export async function getMemories(profileId?: string): Promise<MemoryEntry[]> {
  let q = supabaseAdmin.from("paper_memory").select("*").order("last_seen", { ascending: false });
  if (profileId) q = q.eq("profile_id", profileId);
  const { data, error } = await q;
  fail("getMemories", error);
  return ((data ?? []) as MemoryRow[]).map(toMemory);
}

export async function upsertMemories(entries: MemoryEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const rows = entries.map((e) => ({
    profile_id: e.profileId, kind: e.kind, headline: e.headline, detail: e.detail, weight: e.weight,
    hits: e.hits, first_seen: e.firstSeen, last_seen: e.lastSeen, stats: e.stats,
  }));
  const { error } = await supabaseAdmin.from("paper_memory").upsert(rows, { onConflict: "profile_id,kind,headline" });
  fail("upsertMemories", error);
}

export async function getMemoryCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin.from("paper_memory").select("profile_id");
  fail("getMemoryCounts", error);
  const out = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ profile_id: string }>) out.set(r.profile_id, (out.get(r.profile_id) ?? 0) + 1);
  return out;
}

/** Positions whose `closed_at` lands on `date` as New York reads it. */
export async function getPositionsClosedOn(date: string): Promise<Position[]> {
  const { data, error } = await supabaseAdmin
    .from("paper_positions").select("*").eq("status", "closed")
    .gte("closed_at", `${addDays(date, -1)}T00:00:00Z`).lt("closed_at", `${addDays(date, 2)}T00:00:00Z`);
  fail("getPositionsClosedOn", error);
  return ((data ?? []) as PositionRow[])
    .map(toPosition)
    .filter((p) => p.closedAt !== null && etToday(new Date(p.closedAt)) === date);
}
