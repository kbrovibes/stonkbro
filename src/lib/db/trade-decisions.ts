import { supabaseAdmin } from "@/lib/supabase";

const TABLE = "trade_decisions";

export type DecisionSource = "csp_scan" | "call_scan" | "leaps_scan" | "manual";
export type DecisionStrategy = "CSP" | "CC" | "LEAPS" | "CALL";

export type DecisionOutcome =
  | "expired_worthless"
  | "assigned"
  | "breached_recovered"
  | "expired_otm"
  | "itm"
  | "open"
  | "unknown";

export type NewTradeDecision = {
  decided_at: string;
  source: DecisionSource;
  strategy: DecisionStrategy;
  symbol: string;
  strike: number | null;
  expiry: string | null;
  dte: number | null;
  entry_price: number | null;
  premium: number | null;
  delta: number | null;
  iv: number | null;
  aroc: number | null;
  juiciness: number | null;
  conviction: string | null;
  priority: string | null;
  rsi: number | null;
  technical_score: number | null;
  near_support: boolean | null;
  earnings_within_dte: boolean | null;
  regime: string | null;
  snapshot: Record<string, unknown>;
};

export type TradeDecisionRow = NewTradeDecision & {
  id: string;
  created_at: string;
  outcome: DecisionOutcome | null;
  resolved_at: string | null;
  price_at_expiry: number | null;
  min_price_during: number | null;
  realized_period_pct: number | null;
  realized_aroc: number | null;
  max_drawdown_pct: number | null;
  realized_vs_projected: number | null;
  alpha_vs_hold: number | null;
};

export type DecisionResolution = {
  outcome: DecisionOutcome;
  price_at_expiry: number | null;
  min_price_during: number | null;
  /** P&L over collateral for the holding period. Never annualized — blend this one. */
  realized_period_pct: number | null;
  /** Annualized. Wins only; null for losses so it cannot be averaged into a blend. */
  realized_aroc: number | null;
  max_drawdown_pct: number | null;
  realized_vs_projected: number | null;
  alpha_vs_hold: number | null;
};

const UPSERT_CHUNK = 500;

function decisionKey(d: NewTradeDecision): string {
  return [d.source, d.symbol, d.strike ?? "", d.expiry ?? "", d.decided_at].join("|");
}

/**
 * Bulk insert decisions, skipping any that already exist on
 * (source, symbol, strike, expiry, decided_at). Returns the number inserted.
 */
export async function recordDecisions(decisions: NewTradeDecision[]): Promise<number> {
  if (decisions.length === 0) return 0;

  const seen = new Set<string>();
  const unique = decisions.filter((d) => {
    const k = decisionKey(d);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let inserted = 0;
  for (let i = 0; i < unique.length; i += UPSERT_CHUNK) {
    const chunk = unique.slice(i, i + UPSERT_CHUNK);
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(chunk, {
        onConflict: "source,symbol,strike,expiry,decided_at",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) throw new Error(`recordDecisions: ${error.message}`);
    inserted += (data ?? []).length;
  }
  return inserted;
}

/** Decisions whose expiry has passed but which have no outcome yet. */
export async function getUnresolvedMatured(
  asOf: Date = new Date(),
  limit = 500
): Promise<TradeDecisionRow[]> {
  const today = asOf.toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .is("outcome", null)
    .not("expiry", "is", null)
    .lt("expiry", today)
    .order("expiry", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getUnresolvedMatured: ${error.message}`);
  return (data ?? []) as TradeDecisionRow[];
}

export async function resolveDecision(id: string, resolution: DecisionResolution): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ ...resolution, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`resolveDecision: ${error.message}`);
}

/**
 * `asOf` is the lookahead guard: it returns only decisions that had already
 * resolved by that instant, so replaying history can never see the future.
 */
export async function getResolvedDecisions(opts?: {
  symbol?: string;
  strategy?: DecisionStrategy;
  since?: string;
  asOf?: Date;
  limit?: number;
}): Promise<TradeDecisionRow[]> {
  // PostgREST caps a single response at 1000 rows regardless of .limit(), so a
  // plain limit silently analyses only the most recent slice and reports it as
  // the whole history — which inverts the headline expectancy. Page instead.
  const want = opts?.limit ?? 2000;
  const PAGE = 1000;
  const rows: TradeDecisionRow[] = [];

  for (let from = 0; from < want; from += PAGE) {
    let query = supabaseAdmin
      .from(TABLE)
      .select("*")
      .not("outcome", "is", null)
      .order("expiry", { ascending: false })
      .range(from, Math.min(from + PAGE, want) - 1);

    if (opts?.symbol) query = query.eq("symbol", opts.symbol.toUpperCase());
    if (opts?.strategy) query = query.eq("strategy", opts.strategy);
    if (opts?.since) query = query.gte("decided_at", opts.since);
    if (opts?.asOf) query = query.lte("resolved_at", opts.asOf.toISOString());

    const { data: page, error: pageError } = await query;
    if (pageError) throw new Error(`getResolvedDecisions: ${pageError.message}`);
    if (!page?.length) break;
    rows.push(...(page as TradeDecisionRow[]));
    if (page.length < PAGE) break;
  }

  return rows;
}

export type DecisionStats = {
  total: number;
  resolved: number;
  unresolved: number;
  rows: TradeDecisionRow[];
};

/** Raw resolved rows plus headline counts — the input to the lessons engine. */
export async function getDecisionStats(): Promise<DecisionStats> {
  const [totalRes, resolvedRows] = await Promise.all([
    supabaseAdmin.from(TABLE).select("id", { count: "exact", head: true }),
    getResolvedDecisions({ limit: 5000 }),
  ]);
  if (totalRes.error) throw new Error(`getDecisionStats: ${totalRes.error.message}`);
  const total = totalRes.count ?? 0;
  return {
    total,
    resolved: resolvedRows.length,
    unresolved: Math.max(0, total - resolvedRows.length),
    rows: resolvedRows,
  };
}
