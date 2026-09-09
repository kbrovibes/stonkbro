/**
 * Replaying a month.
 *
 * `runner.ts` runs one session against live data and Supabase. This runs many
 * sessions against recorded daily bars and keeps every ledger in memory, so a
 * whole month can be simulated in seconds without touching the database.
 *
 * The engine underneath is the real one — same broker, same settlement, same
 * strategies. Only the market is reconstructed:
 *
 *   · Prices come from that symbol's daily bar. Open session fills at the
 *     open, midday at the day's midpoint, close at the close.
 *   · Indicators see bars strictly before the simulated date, with the
 *     session's own price appended as the live tick. No bar from the future
 *     is ever in scope.
 *   · Option chains are modelled (see `synthetic.ts`), because no provider
 *     serves a chain as it stood a month ago.
 *
 * The midday price is the only real concession: a daily bar has no intraday
 * path, so the day's high/low midpoint stands in for it, and that midpoint is
 * only knowable after the close. Anything a bot does at midday therefore has
 * a sliver of hindsight in it. Open and close fills do not.
 */
import type { DailyBar } from "@/lib/market/history";
import type { QuoteData } from "@/lib/market/types";
import { equityOf, isOpen, type BrokerState } from "./broker";
import { buildSnapshot, runProfile } from "./engine";
import { buildMemories, type MemoryEntry } from "./memory";
import { newMarketData, type MarketData } from "./market";
import { buildProfileNote } from "./notes";
import { realizedVol } from "./synthetic";
import {
  MARGIN_LIMIT,
  START_CASH,
  SESSIONS,
  type Account,
  type Position,
  type ProfileNote,
  type Profile,
  type Session,
  type Snapshot,
  type Trade,
} from "./types";

export type BarMap = Map<string, DailyBar[]>;

export interface BackfillOptions {
  from: string;
  to: string;
  bars: BarMap;
  profiles: Profile[];
  /** Symbols to quote every session. Defaults to every symbol with bars. */
  quoteSymbols?: string[];
  onDay?: (date: string, index: number, total: number) => void;
}

export interface ProfileLedger {
  profile: Profile;
  account: Account;
  positions: Position[];
  trades: Trade[];
  /** One per trading day, at the close. */
  snapshots: Snapshot[];
  notes: ProfileNote[];
  memories: MemoryEntry[];
}

export interface BackfillResult {
  days: string[];
  ledgers: Map<string, ProfileLedger>;
  /** Symbols that had no usable bars, so never traded. */
  missing: string[];
}

const SESSION_HOUR: Record<Session, string> = { open: "13:35", midday: "17:00", close: "20:00" };

/** Session price from a daily bar. Midday uses the day's midpoint. */
export function sessionPrice(bar: DailyBar, session: Session): number {
  if (session === "open") return bar.open;
  if (session === "close") return bar.close;
  const mid = (bar.high + bar.low) / 2;
  return Number.isFinite(mid) && mid > 0 ? mid : bar.close;
}

function indexBars(bars: DailyBar[]): Map<string, number> {
  const ix = new Map<string, number>();
  bars.forEach((b, i) => ix.set(b.date, i));
  return ix;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

function quoteFrom(symbol: string, bars: DailyBar[], i: number, session: Session): QuoteData {
  const bar = bars[i];
  const price = sessionPrice(bar, session);
  const prev = i > 0 ? bars[i - 1].close : bar.open;
  const before = bars.slice(0, i);
  const closes = before.map((b) => b.close);
  const year = before.slice(-252);
  const fifty = closes.slice(-50);
  const twoHundred = closes.slice(-200);
  return {
    symbol,
    name: symbol,
    price,
    change: price - prev,
    changePct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
    volume: bar.volume,
    avgVolume: mean(before.slice(-20).map((b) => b.volume)) || bar.volume,
    volumeRatio: 1,
    marketCap: 0,
    fiftyDayAvg: mean(fifty),
    twoHundredDayAvg: mean(twoHundred),
    above50sma: fifty.length > 0 && price > mean(fifty),
    above200sma: twoHundred.length > 0 && price > mean(twoHundred),
    fiftyTwoWeekHigh: year.length ? Math.max(...year.map((b) => b.high)) : bar.high,
    fiftyTwoWeekLow: year.length ? Math.min(...year.map((b) => b.low)) : bar.low,
    earningsDate: null,
  };
}

/** The market as it stood at one session, with nothing from later in scope. */
export function marketAt(
  date: string,
  session: Session,
  bars: BarMap,
  index: Map<string, Map<string, number>>,
  symbols: string[],
): MarketData {
  const data = newMarketData(date);
  const vol = new Map<string, number>();
  for (const symbol of symbols) {
    const series = bars.get(symbol);
    const i = index.get(symbol)?.get(date);
    if (!series || i == null) continue;
    const before = series.slice(0, i);
    data.quotes.set(symbol, quoteFrom(symbol, series, i, session));
    data.histories.set(symbol, before);
    vol.set(symbol, realizedVol(before));
  }
  data.synthetic = { vol };
  return data;
}

function newAccount(profileId: string, startedOn: string): Account {
  return {
    profileId,
    cash: START_CASH,
    marginLimit: MARGIN_LIMIT,
    realizedPnl: 0,
    fees: 0,
    interest: 0,
    startedOn,
    state: {},
  };
}

function weekKey(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export async function runBackfill(opts: BackfillOptions): Promise<BackfillResult> {
  const { bars, profiles } = opts;
  const symbols = opts.quoteSymbols ?? [...bars.keys()];
  const index = new Map([...bars].map(([s, b]) => [s, indexBars(b)] as const));

  const calendar = (bars.get("SPY") ?? [...bars.values()][0] ?? [])
    .map((b) => b.date)
    .filter((d) => d >= opts.from && d <= opts.to);

  const missing = symbols.filter((s) => !bars.get(s)?.length);
  const ledgers = new Map<string, ProfileLedger>();
  const states = new Map<string, BrokerState>();
  for (const profile of profiles) {
    const account = newAccount(profile.id, calendar[0] ?? opts.from);
    states.set(profile.id, { account, positions: [] });
    ledgers.set(profile.id, { profile, account, positions: [], trades: [], snapshots: [], notes: [], memories: [] });
  }

  const seenWeeks = new Set<string>();
  const seenMonths = new Set<string>();
  const prevCloseEquity = new Map<string, number>();

  for (const [dayIndex, date] of calendar.entries()) {
    opts.onDay?.(date, dayIndex, calendar.length);
    const week = weekKey(date);
    const month = date.slice(0, 7);
    const firstOfWeek = !seenWeeks.has(week);
    const firstOfMonth = !seenMonths.has(month);
    seenWeeks.add(week);
    seenMonths.add(month);

    for (const session of SESSIONS) {
      const data = marketAt(date, session, bars, index, symbols);
      const ts = `${date}T${SESSION_HOUR[session]}:00.000Z`;

      for (const profile of profiles) {
        const state = states.get(profile.id);
        const ledger = ledgers.get(profile.id);
        if (!state || !ledger) continue;
        try {
          const result = await runProfile({
            profile,
            state,
            data,
            session,
            date,
            ts,
            isFirstSessionOfWeek: firstOfWeek && session === "open",
            isFirstSessionOfMonth: firstOfMonth && session === "open",
            trade: true,
          });
          ledger.trades.push(...result.trades);
        } catch (e) {
          ledger.trades.push({
            id: `err-${date}-${session}-${profile.id}`,
            profileId: profile.id,
            ts,
            tradeDate: date,
            session,
            symbol: "ERROR",
            kind: "cash",
            action: "reject",
            qty: 0,
            price: 0,
            strike: null,
            expiry: null,
            amount: 0,
            fees: 0,
            reason: `Strategy error: ${e instanceof Error ? e.message : String(e)}`,
            positionId: null,
            status: "rejected",
          });
        }
      }
    }

    // End of day: snapshot, note, and what the day taught each bot.
    for (const profile of profiles) {
      const state = states.get(profile.id);
      const ledger = ledgers.get(profile.id);
      if (!state || !ledger) continue;
      const snapshot = buildSnapshot(state, "close", date, prevCloseEquity.get(profile.id) ?? START_CASH);
      prevCloseEquity.set(profile.id, snapshot.equity);
      ledger.snapshots.push(snapshot);

      const todaysTrades = ledger.trades.filter((t) => t.tradeDate === date);
      ledger.notes.push(buildProfileNote({ profile, account: state.account, snapshot, trades: todaysTrades }, date));

      const closedToday = state.positions.filter((p) => p.closedAt?.slice(0, 10) === date);
      ledger.memories = buildMemories(
        {
          profile,
          account: state.account,
          snapshot,
          trades: todaysTrades,
          closedToday,
          series: ledger.snapshots.map((s) => ({ date: s.snapDate, equity: s.equity })),
          existing: ledger.memories,
        },
        date,
      );
    }
  }

  for (const profile of profiles) {
    const state = states.get(profile.id);
    const ledger = ledgers.get(profile.id);
    if (!state || !ledger) continue;
    ledger.account = state.account;
    ledger.positions = state.positions;
  }

  return { days: calendar, ledgers, missing };
}

export function equityOfLedger(ledger: ProfileLedger): number {
  const last = ledger.snapshots[ledger.snapshots.length - 1];
  return last ? last.equity : START_CASH;
}

export function openCount(ledger: ProfileLedger): number {
  return ledger.positions.filter(isOpen).length;
}

export { equityOf };
