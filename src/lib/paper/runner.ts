/**
 * `runPaperSession` — one cron tick. Orchestration and persistence only; the
 * per-profile mechanics live in `engine.ts`.
 *
 * Idempotent: a completed (date, session) run marks and re-snapshots but does
 * not trade. A run that died part-way records which profiles finished in its
 * log, so a retry only trades the profiles that never got their turn.
 */
import * as db from "@/lib/db/paper";
import type { BrokerState } from "./broker";
import { etToday, isWeekend, monthStart, weekStart } from "./dates";
import { buildSnapshot, runProfile } from "./engine";
import { loadHistories, loadQuotes, newMarketData } from "./market";
import { buildMemories } from "./memory";
import { addNarratives, buildDeskNote, buildProfileNote } from "./notes";
import { PROFILES, allQuoteSymbols } from "./profiles";
import { SESSION_ORDER, type Account, type ProfileNote, type Session, type Snapshot, type Trade } from "./types";

export interface RunOptions {
  session: Session;
  date?: string;
  onProgress?: (text: string) => Promise<void> | void;
}

export interface ProfileSummary {
  equity: number;
  orders: number;
  trades: number;
  rejected: number;
  traded: boolean;
  error?: string;
}

export interface RunSummary {
  date: string;
  session: Session;
  status: "completed" | "failed" | "skipped";
  ms: number;
  traded: boolean;
  profiles: Record<string, ProfileSummary>;
  errors: string[];
}

const INDICATOR_PROFILES = ["sector-rotator", "megacap-momentum", "margin-bull", "dip-buyer"];

function firstSessionFlags(runs: db.RunRow[], date: string, session: Session): { week: boolean; month: boolean } {
  const earlierToday = runs.some((r) => r.run_date === date && SESSION_ORDER[r.session] < SESSION_ORDER[session]);
  const earlierThisWeek = runs.some((r) => r.run_date >= weekStart(date) && r.run_date < date);
  const earlierThisMonth = runs.some((r) => r.run_date >= monthStart(date) && r.run_date < date);
  return { week: !earlierToday && !earlierThisWeek, month: !earlierToday && !earlierThisMonth };
}

function toTrade(r: db.TradeRow): Trade {
  return {
    id: r.id, profileId: r.profile_id, ts: r.ts, tradeDate: r.trade_date, session: r.session, symbol: r.symbol,
    kind: r.kind as Trade["kind"], action: r.action as Trade["action"], qty: Number(r.qty), price: Number(r.price),
    strike: r.strike == null ? null : Number(r.strike), expiry: r.expiry, amount: Number(r.amount), fees: Number(r.fees),
    reason: r.reason, positionId: r.position_id, status: r.status as Trade["status"],
  };
}

async function writeNotes(date: string, snapshots: Snapshot[], accounts: Map<string, Account>): Promise<void> {
  const todays = (await db.getTradesOnDate(date)).map(toTrade);
  const notes: ProfileNote[] = [];
  for (const profile of PROFILES) {
    const snapshot = snapshots.find((s) => s.profileId === profile.id);
    const account = accounts.get(profile.id);
    if (!snapshot || !account) continue;
    notes.push(buildProfileNote({ profile, account, snapshot, trades: todays.filter((t) => t.profileId === profile.id) }, date));
  }
  const desk = buildDeskNote(notes, PROFILES, date);
  const withNarratives = await addNarratives(notes, desk, PROFILES, date);
  await db.upsertNotes([...withNarratives.notes, withNarratives.desk]);
}

/** What the day taught each bot. Never feeds back into orders — this is character, not signal. */
async function writeMemories(date: string, snapshots: Snapshot[], accounts: Map<string, Account>): Promise<void> {
  const [todays, closedToday, existing, series] = await Promise.all([
    db.getTradesOnDate(date).then((rows) => rows.map(toTrade)),
    db.getPositionsClosedOn(date),
    db.getMemories(),
    db.getCloseSeries(400),
  ]);
  const updated = PROFILES.flatMap((profile) => {
    const snapshot = snapshots.find((s) => s.profileId === profile.id);
    const account = accounts.get(profile.id);
    if (!snapshot || !account) return [];
    return buildMemories(
      {
        profile,
        account,
        snapshot,
        trades: todays.filter((t) => t.profileId === profile.id),
        closedToday: closedToday.filter((p) => p.profileId === profile.id),
        series: (series.get(profile.id) ?? []).map((pt) => ({ date: pt.date, equity: pt.equity })),
        existing: existing.filter((m) => m.profileId === profile.id),
      },
      date,
    );
  });
  await db.upsertMemories(updated);
}

export async function runPaperSession(opts: RunOptions): Promise<RunSummary> {
  const started = Date.now();
  const date = opts.date ?? etToday();
  const { session } = opts;
  const progress = async (t: string) => { await opts.onProgress?.(t); };
  const summary: RunSummary = { date, session, status: "completed", ms: 0, traded: false, profiles: {}, errors: [] };

  if (isWeekend(date)) {
    summary.status = "skipped";
    summary.errors.push(`${date} is a weekend`);
    summary.ms = Date.now() - started;
    return summary;
  }

  const existing = await db.getRun(date, session);
  const alreadyCompleted = existing?.status === "completed";
  const doneBefore = new Set(Object.keys((existing?.log?.profiles as Record<string, unknown> | undefined) ?? {}));
  summary.traded = !alreadyCompleted;
  const runId = await db.startRun(date, session);
  const log: Record<string, unknown> = { profiles: {}, errors: [], rerun: alreadyCompleted };

  try {
    await progress("Preparing accounts");
    await db.upsertProfiles(PROFILES);
    const accounts = await db.ensureAccounts(PROFILES.map((p) => p.id), date);
    const openPositions = await db.getOpenPositions();
    const runs = await db.getCompletedRunsSince(monthStart(date) < weekStart(date) ? monthStart(date) : weekStart(date));
    const flags = firstSessionFlags(runs, date, session);
    const prevClose = await db.getPreviousCloseEquity(date);

    await progress("Fetching quotes");
    const data = newMarketData(date);
    const held = openPositions.map((p) => p.symbol);
    await loadQuotes(data, [...allQuoteSymbols(), ...held]);
    await progress("Fetching history");
    const indicatorSymbols = PROFILES.filter((p) => INDICATOR_PROFILES.includes(p.id)).flatMap((p) => p.universe);
    await loadHistories(data, [...new Set([...indicatorSymbols, ...held])]);

    const snapshots: Snapshot[] = [];
    for (const [i, profile] of PROFILES.entries()) {
      await progress(`${profile.name} (${i + 1}/${PROFILES.length})`);
      const account = accounts.get(profile.id);
      if (!account) continue;
      const state: BrokerState = { account, positions: openPositions.filter((p) => p.profileId === profile.id) };
      const trade = !alreadyCompleted && !doneBefore.has(profile.id);
      try {
        const result = await runProfile({
          profile, state, data, session, date, ts: new Date().toISOString(),
          isFirstSessionOfWeek: flags.week, isFirstSessionOfMonth: flags.month, trade,
        });
        await db.upsertPositions(state.positions);
        await db.insertTrades(result.trades);
        await db.saveAccount(account);
        const snap = buildSnapshot(state, session, date, prevClose.get(profile.id) ?? null);
        snapshots.push(snap);
        summary.profiles[profile.id] = {
          equity: snap.equity,
          orders: result.orders.length,
          trades: result.trades.length,
          rejected: result.trades.filter((t) => t.status === "rejected").length,
          traded: trade,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.errors.push(`${profile.id}: ${msg}`);
        summary.profiles[profile.id] = { equity: 0, orders: 0, trades: 0, rejected: 0, traded: false, error: msg };
        console.error(`[paper] ${profile.id} failed:`, e);
      }
      (log.profiles as Record<string, unknown>)[profile.id] = summary.profiles[profile.id];
      await db.patchRunLog(runId, log).catch(() => undefined);
    }

    await progress("Writing snapshots");
    await db.upsertSnapshots(snapshots);

    if (session === "close" && !alreadyCompleted) {
      await progress("Writing notes");
      try {
        await writeNotes(date, snapshots, accounts);
      } catch (e) {
        summary.errors.push(`notes: ${e instanceof Error ? e.message : String(e)}`);
      }
      await progress("Updating memory");
      try {
        await writeMemories(date, snapshots, accounts);
      } catch (e) {
        summary.errors.push(`memory: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    summary.ms = Date.now() - started;
    log.errors = [...summary.errors, ...data.errors.slice(0, 20)];
    log.marketErrors = data.errors.length;
    log.ms = summary.ms;
    await db.finishRun(runId, "completed", log);
    return summary;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    summary.status = "failed";
    summary.errors.push(msg);
    summary.ms = Date.now() - started;
    log.errors = summary.errors;
    await db.finishRun(runId, "failed", log).catch(() => undefined);
    throw e;
  }
}
