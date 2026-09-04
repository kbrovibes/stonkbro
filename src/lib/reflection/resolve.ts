/**
 * Grade matured decisions against what the underlying actually did.
 *
 * Pure price arithmetic — no LLM, no external state beyond daily bars.
 */

import { getHistory, DailyBar } from "@/lib/market/history";
import {
  DecisionOutcome,
  DecisionResolution,
  TradeDecisionRow,
  getResolvedDecisions,
  getUnresolvedMatured,
  resolveDecision,
} from "@/lib/db/trade-decisions";

const DAY_MS = 86_400_000;
const MAX_LOOKBACK_DAYS = 1200;
const CONCURRENCY = 5;

/** Run lazily-created tasks in batches, discarding rejections. */
async function settledBatch<T>(tasks: Array<() => Promise<T>>, batchSize: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const settled = await Promise.allSettled(tasks.slice(i, i + batchSize).map((t) => t()));
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    if (i + batchSize < tasks.length) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

function dayString(iso: string): string {
  return iso.slice(0, 10);
}

function annualize(periodReturnPct: number, dte: number | null): number {
  if (!dte || dte <= 0) return periodReturnPct;
  return periodReturnPct * (365 / dte);
}

type Graded = {
  id: string;
  resolution: DecisionResolution;
};

function grade(row: TradeDecisionRow, bars: DailyBar[]): DecisionResolution | null {
  const expiry = row.expiry;
  const strike = row.strike;
  if (!expiry || strike === null) return null;

  const decidedDay = dayString(row.decided_at);

  const atOrBefore = bars.filter((b) => b.date <= expiry);
  if (atOrBefore.length === 0) {
    return {
      outcome: "unknown",
      price_at_expiry: null,
      min_price_during: null,
      realized_period_pct: null,
      realized_aroc: null,
      max_drawdown_pct: null,
      realized_vs_projected: null,
      alpha_vs_hold: null,
    };
  }

  const priceAtExpiry = atOrBefore[atOrBefore.length - 1].close;
  const window = bars.filter((b) => b.date >= decidedDay && b.date <= expiry);
  const minDuring = window.length > 0 ? Math.min(...window.map((b) => b.low)) : null;

  const entry = row.entry_price;
  const maxDrawdownPct =
    entry !== null && entry > 0 && minDuring !== null ? ((minDuring - entry) / entry) * 100 : null;

  const isShortPut = row.strategy === "CSP" || row.strategy === "CC";

  // Buy-and-hold benchmark over the identical window, taken from the same bar
  // series so both legs are apples-to-apples.
  const atOrAfterDecision = bars.find((b) => b.date >= decidedDay);
  const holdEntry =
    atOrAfterDecision && atOrAfterDecision.close > 0
      ? atOrAfterDecision.close
      : entry !== null && entry > 0
        ? entry
        : null;
  const holdReturnPct =
    holdEntry !== null ? ((priceAtExpiry - holdEntry) / holdEntry) * 100 : null;

  let outcome: DecisionOutcome;
  let periodPct: number | null;
  // Annualized only where it is meaningful. A realized loss is a one-time event;
  // scaling it by 365/dte would claim we repeat it every cycle.
  let realizedAroc: number | null = null;

  if (isShortPut) {
    const collateral =
      typeof row.snapshot?.collateralRequired === "number" && row.snapshot.collateralRequired > 0
        ? (row.snapshot.collateralRequired as number)
        : strike * 100;
    const premium = row.premium ?? 0;

    if (priceAtExpiry >= strike) {
      outcome = minDuring !== null && minDuring < strike ? "breached_recovered" : "expired_worthless";
      periodPct = (premium / collateral) * 100;
      realizedAroc = row.aroc ?? annualize(periodPct, row.dte);
    } else {
      outcome = "assigned";
      periodPct = ((premium - (strike - priceAtExpiry) * 100) / collateral) * 100;
    }
  } else {
    const cost = row.premium && row.premium > 0 ? row.premium : null;
    const intrinsic = Math.max(0, priceAtExpiry - strike) * 100;
    outcome = priceAtExpiry > strike ? "itm" : "expired_otm";
    periodPct = cost !== null ? ((intrinsic - cost) / cost) * 100 : null;
  }

  const period = periodPct !== null && Number.isFinite(periodPct) ? periodPct : null;

  // The AROC we advertised, expressed over this contract's actual holding period,
  // so promise and outcome are compared on the same basis.
  const projectedPeriodPct =
    row.aroc !== null && row.dte !== null && row.dte > 0 ? (row.aroc * row.dte) / 365 : null;

  return {
    outcome,
    price_at_expiry: priceAtExpiry,
    min_price_during: minDuring,
    realized_period_pct: period,
    realized_aroc:
      realizedAroc === null || !Number.isFinite(realizedAroc) ? null : realizedAroc,
    max_drawdown_pct: maxDrawdownPct,
    realized_vs_projected:
      period !== null && projectedPeriodPct !== null ? period - projectedPeriodPct : null,
    alpha_vs_hold:
      period !== null && holdReturnPct !== null && Number.isFinite(holdReturnPct)
        ? period - holdReturnPct
        : null,
  };
}

async function gradeAndWrite(
  rows: TradeDecisionRow[]
): Promise<{ resolved: number; errors: string[] }> {
  const errors: string[] = [];
  if (rows.length === 0) return { resolved: 0, errors };

  const bySymbol = new Map<string, TradeDecisionRow[]>();
  for (const row of rows) {
    const list = bySymbol.get(row.symbol);
    if (list) list.push(row);
    else bySymbol.set(row.symbol, [row]);
  }

  const now = Date.now();
  const tasks = [...bySymbol.entries()].map(([symbol, rows]) => async (): Promise<Graded[]> => {
    const oldest = Math.min(...rows.map((r) => new Date(r.decided_at).getTime()));
    const days = Math.min(MAX_LOOKBACK_DAYS, Math.ceil((now - oldest) / DAY_MS) + 5);

    let bars: DailyBar[];
    try {
      bars = await getHistory(symbol, days);
    } catch (e) {
      errors.push(`${symbol}: history fetch failed (${e})`);
      return [];
    }
    if (bars.length === 0) {
      errors.push(`${symbol}: no price history`);
      return [];
    }

    const graded: Graded[] = [];
    for (const row of rows) {
      try {
        const resolution = grade(row, bars);
        if (resolution) graded.push({ id: row.id, resolution });
      } catch (e) {
        errors.push(`${symbol} ${row.strike}/${row.expiry}: ${e}`);
      }
    }
    return graded;
  });

  const batches = await settledBatch(tasks, CONCURRENCY);
  const all = batches.flat();

  let resolved = 0;
  for (const { id, resolution } of all) {
    try {
      await resolveDecision(id, resolution);
      resolved++;
    } catch (e) {
      errors.push(`write ${id}: ${e}`);
    }
  }

  return { resolved, errors };
}

/**
 * Grade decisions whose expiry has passed. Idempotent and safe to run
 * repeatedly: it only ever picks up rows with a null outcome, so each pass
 * chews through the next `limit` and re-running simply continues the backlog.
 */
export async function resolveMaturedDecisions(
  limit = 200
): Promise<{ resolved: number; errors: string[] }> {
  const pending = await getUnresolvedMatured(new Date(), limit);
  return gradeAndWrite(pending);
}

/**
 * Re-grade rows that were already resolved, in place. Needed after a
 * methodology change — it never clears `outcome`, so a failed or partial run
 * leaves the existing values untouched rather than blanking the journal.
 */
export async function regradeResolvedDecisions(
  limit = 500
): Promise<{ resolved: number; errors: string[] }> {
  const rows = await getResolvedDecisions({ limit });
  return gradeAndWrite(rows);
}
