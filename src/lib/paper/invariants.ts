/**
 * The safety claims, as tests.
 *
 * Anyone can write "no naked calls" in a rulebook. These check it against
 * what the ledgers actually did, on every day of a run, so the claim in the
 * report is evidence rather than an assertion.
 *
 * Shared by the validator script and the report so the two can never drift.
 */
import { ETFS, SECTOR_ETFS } from "./profiles";
import { MARGIN_LIMIT, START_CASH, type MarkedPosition, type Position, type Snapshot, type Trade } from "./types";

export interface CheckedProfile {
  id: string;
  name: string;
  margin: boolean;
  snapshots: Snapshot[];
  trades: Trade[];
  positions: Position[];
  memories: unknown[];
}

export interface CheckLine {
  ok: boolean;
  text: string;
}

export interface CheckGroup {
  title: string;
  /** What passing actually establishes. */
  claim: string;
  lines: CheckLine[];
  ok: boolean;
}

/** A diversified fund is not single-name concentration. */
const BASKETS = new Set([...ETFS, ...SECTOR_ETFS, "VTI", "VOO", "DIA"]);

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
const group = (title: string, claim: string, lines: CheckLine[]): CheckGroup => ({
  title,
  claim,
  lines,
  ok: lines.every((l) => l.ok),
});

export function checkInvariants(profiles: CheckedProfile[], dayCount: number): CheckGroup[] {
  const out: CheckGroup[] = [];

  const empty: string[] = [];
  let totalTrades = 0;
  for (const p of profiles) {
    for (const t of p.trades) {
      totalTrades++;
      if (!t.reason || t.reason.trim().length === 0) empty.push(`${p.name} ${t.tradeDate} ${t.action} ${t.symbol}`);
    }
  }
  out.push(
    group("Every trade explains itself", "No order, filled or rejected, was recorded without a written reason.", [
      empty.length === 0
        ? { ok: true, text: `${totalTrades} trades, none missing a reason` }
        : { ok: false, text: `${empty.length} of ${totalTrades} trades have no reason (${empty.slice(0, 3).join("; ")})` },
    ]),
  );

  const naked: string[] = [];
  let shortCallDays = 0;
  for (const p of profiles) {
    for (const snap of p.snapshots) {
      const open = snap.positions as MarkedPosition[];
      for (const c of open.filter((x) => x.kind === "call" && x.side === "short")) {
        shortCallDays++;
        const shares = open
          .filter((x) => x.kind === "stock" && x.side === "long" && x.symbol === c.symbol)
          .reduce((s, x) => s + x.qty, 0);
        const covered = open.some(
          (x) => x.kind === "call" && x.side === "long" && x.symbol === c.symbol &&
            (x.expiry ?? "") >= (c.expiry ?? "") && x.qty >= c.qty,
        );
        if (shares < c.qty * 100 && !covered) naked.push(`${p.name} ${snap.snapDate} ${c.symbol} ${c.strike}C`);
      }
    }
  }
  out.push(
    group("No naked short calls", "Every short call was backed by shares or by a longer-dated long call, every day it was open.", [
      naked.length === 0
        ? { ok: true, text: `${shortCallDays} short-call position-days, all covered` }
        : { ok: false, text: `${naked.length} uncovered days (${naked.slice(0, 3).join("; ")})` },
    ]),
  );

  out.push(
    group("Margin stayed inside the line", `Nobody exceeded the ${usd(MARGIN_LIMIT)} margin limit, and cash-only bots never borrowed.`,
      profiles.map((p) => {
        const borrowed = Math.max(0, ...p.snapshots.map((s) => Math.max(0, -s.cash)));
        const used = Math.max(0, ...p.snapshots.map((s) => s.marginUsed));
        if (!p.margin && borrowed > 1) return { ok: false, text: `${p.name} is cash-only but borrowed ${usd(borrowed)}` };
        if (used > MARGIN_LIMIT) return { ok: false, text: `${p.name} used ${usd(used)}, over the line` };
        return { ok: true, text: `${p.name} peaked at ${usd(used)}${p.margin ? "" : " (never borrowed)"}` };
      }),
    ),
  );

  out.push(
    group("No bet on one company got out of hand", "No single company was ever worth more than a third of a bot's equity. Index and sector funds are exempt: a broad fund is a basket, not a bet.",
      profiles.map((p) => {
        let worst = 0;
        let label = "";
        for (const snap of p.snapshots) {
          for (const pos of snap.positions as MarkedPosition[]) {
            if (BASKETS.has(pos.symbol)) continue;
            const share = snap.equity > 0 ? (Math.abs(pos.value) / snap.equity) * 100 : 0;
            if (share > worst) {
              worst = share;
              label = pos.symbol;
            }
          }
        }
        return worst > 34
          ? { ok: false, text: `${p.name} held ${worst.toFixed(1)}% in ${label}` }
          : { ok: true, text: `${p.name} largest single name ${worst.toFixed(1)}%${label ? ` (${label})` : ""}` };
      }),
    ),
  );

  out.push(
    group("Nobody blew up", "No bot's equity ever fell more than a quarter below the capital it started with.",
      profiles.map((p) => {
        const low = Math.min(...p.snapshots.map((s) => s.equity), START_CASH);
        const drop = ((low - START_CASH) / START_CASH) * 100;
        return drop < -25
          ? { ok: false, text: `${p.name} fell ${drop.toFixed(1)}% below start` }
          : { ok: true, text: `${p.name} worst equity ${usd(low)} (${drop >= 0 ? "+" : "−"}${Math.abs(drop).toFixed(1)}%)` };
      }),
    ),
  );

  out.push(
    group(
      "Nobody was asleep",
      "Every bot either traded or deliberately stood aside in cash. A trend bot with nothing above its moving averages is supposed to hold cash; a bot sitting on positions it never touched is not.",
      profiles.map((p) => {
        const filled = p.trades.filter((t) => t.status === "filled");
        const days = new Set(filled.map((t) => t.tradeDate)).size;
        const openAtEnd = p.positions.filter((x) => x.status === "open").length;
        if (filled.length > 0) {
          return { ok: true, text: `${p.name} ${filled.length} trades across ${days} of ${dayCount} days` };
        }
        return openAtEnd === 0
          ? { ok: true, text: `${p.name} stood aside in cash all month — no signal met its rules` }
          : { ok: false, text: `${p.name} made no trades while holding ${openAtEnd} position(s)` };
      }),
    ),
  );

  out.push(
    group(
      "Memory accumulated",
      "Every bot carries its creed plus whatever the month taught it. A bot that never traded earns little beyond the creed, which is the honest outcome rather than a failure.",
      profiles.map((p) => {
        const traded = p.trades.some((t) => t.status === "filled");
        if (p.memories.length === 0) return { ok: false, text: `${p.name} has no memory at all` };
        if (traded && p.memories.length < 2) {
          return { ok: false, text: `${p.name} traded but learned nothing beyond its creed` };
        }
        return { ok: true, text: `${p.name} ${p.memories.length} ${p.memories.length === 1 ? "memory" : "memories"}` };
      }),
    ),
  );

  return out;
}
