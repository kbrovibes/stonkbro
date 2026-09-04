/**
 * Backfill the decision journal from historical scan rows.
 *
 * Every candidate we ever surfaced in `csp_scans` becomes a `trade_decisions`
 * row stamped with the scan's `created_at`, so the reflection engine has months
 * of history to grade on day one.
 */

import { supabaseAdmin } from "@/lib/supabase";
import {
  NewTradeDecision,
  DecisionSource,
  DecisionStrategy,
  recordDecisions,
} from "@/lib/db/trade-decisions";

type ScanRow = {
  created_at: string;
  candidates: unknown;
  call_candidates: unknown;
  leaps_candidates: unknown;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

/** ISO date (YYYY-MM-DD) or null — Postgres `date` rejects anything else. */
function isoDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function toDecision(
  raw: unknown,
  decidedAt: string,
  source: DecisionSource,
  strategy: DecisionStrategy
): NewTradeDecision | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;

  const symbol = str(c.symbol);
  const strike = num(c.strike);
  const expiry = isoDate(c.expiry);
  if (!symbol || strike === null || !expiry) return null;

  const isShortPut = strategy === "CSP" || strategy === "CC";
  const premium = isShortPut ? num(c.premium) : num(c.costPerContract) ?? num(c.premium);
  const delta = num(c.delta);

  return {
    decided_at: decidedAt,
    source,
    strategy,
    symbol: symbol.toUpperCase(),
    strike,
    expiry,
    dte: num(c.dte),
    entry_price: num(c.currentPrice),
    premium,
    delta: delta === null ? null : Math.abs(delta),
    iv: num(c.iv),
    aroc: num(c.aroc),
    juiciness: num(c.juiciness) ?? num(c.score),
    conviction: str(c.conviction),
    priority: str(c.priority),
    rsi: num(c.rsi),
    technical_score: num(c.technicalScore),
    near_support: bool(c.nearSupport),
    earnings_within_dte: bool(c.earningsWithinDTE),
    regime: null,
    snapshot: c,
  };
}

function mapArray(
  raw: unknown,
  decidedAt: string,
  source: DecisionSource,
  strategy: DecisionStrategy
): NewTradeDecision[] {
  if (!Array.isArray(raw)) return [];
  const out: NewTradeDecision[] = [];
  for (const item of raw) {
    try {
      const d = toDecision(item, decidedAt, source, strategy);
      if (d) out.push(d);
    } catch {
      // malformed candidate — skip it, never fail the whole backfill
    }
  }
  return out;
}

export async function backfillFromCspScans(): Promise<{ inserted: number; scansRead: number }> {
  const { data, error } = await supabaseAdmin
    .from("csp_scans")
    .select("created_at, candidates, call_candidates, leaps_candidates")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`backfillFromCspScans: ${error.message}`);

  const scans = (data ?? []) as ScanRow[];
  const decisions: NewTradeDecision[] = [];

  for (const scan of scans) {
    const decidedAt = scan.created_at;
    if (!decidedAt) continue;
    decisions.push(...mapArray(scan.candidates, decidedAt, "csp_scan", "CSP"));
    decisions.push(...mapArray(scan.call_candidates, decidedAt, "call_scan", "CALL"));
    decisions.push(...mapArray(scan.leaps_candidates, decidedAt, "leaps_scan", "LEAPS"));
  }

  const inserted = await recordDecisions(decisions);
  return { inserted, scansRead: scans.length };
}
