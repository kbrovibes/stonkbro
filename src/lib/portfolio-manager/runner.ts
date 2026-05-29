import { getStockHoldingsToday } from "./holdings";
import { enrichAll } from "./enrich";
import { analyzeAll } from "./analyst";
import {
  insertScan,
  markComplete,
  markFailed,
} from "@/lib/db/portfolio-manager-scans";
import type { TickerSnapshot } from "./types";

export type RunOptions = {
  scan_type: "scheduled" | "manual";
  trigger_source: string | null;
  userId?: string;
};

export type RunResult = {
  scan_id: string;
  ticker_count: number;
  duration_ms: number;
  status: "completed" | "failed" | "empty";
};

/**
 * One-shot: holdings → insert → enrich → analyze → markComplete.
 * Blocks for the entire scan. On Vercel Hobby (60s cap), prefer the
 * 2-phase API: initScan() + executeScan(scan_id, ...) with `after()`.
 */
export async function runPortfolioManagerScan(opts: RunOptions): Promise<RunResult> {
  const t0 = Date.now();
  const { tickers, free_cash } = await getStockHoldingsToday();
  const scan_id = await insertScan({
    scan_type: opts.scan_type,
    trigger_source: opts.trigger_source,
    tickers,
  });
  if (tickers.length === 0) {
    await markEmpty(scan_id, t0);
    return { scan_id, ticker_count: 0, duration_ms: Date.now() - t0, status: "empty" };
  }
  return executeScan(scan_id, tickers, free_cash, opts.userId, t0);
}

/**
 * Phase 1 — quickly grab today's holdings, insert a 'running' row,
 * return enough state for phase 2 to take over in the background.
 */
export async function initScan(opts: RunOptions): Promise<{
  scan_id: string;
  tickers: TickerSnapshot[];
  free_cash: number;
  ticker_count: number;
}> {
  const { tickers, free_cash } = await getStockHoldingsToday();
  const scan_id = await insertScan({
    scan_type: opts.scan_type,
    trigger_source: opts.trigger_source,
    tickers,
  });
  return { scan_id, tickers, free_cash, ticker_count: tickers.length };
}

/**
 * Phase 2 — long-running enrichment + AI call. Awaits its own completion.
 * Safe to schedule via `after()` after the HTTP response is sent.
 */
export async function executeScan(
  scan_id: string,
  tickers: TickerSnapshot[],
  free_cash: number,
  userId?: string,
  t0: number = Date.now()
): Promise<RunResult> {
  if (tickers.length === 0) {
    await markEmpty(scan_id, t0);
    return { scan_id, ticker_count: 0, duration_ms: Date.now() - t0, status: "empty" };
  }
  try {
    const enrichments = await enrichAll(tickers.map((t) => t.symbol), 5);
    const result = await analyzeAll(tickers, enrichments, free_cash, userId);
    await markComplete(scan_id, {
      analyses: result.analyses,
      allocation: result.allocation,
      ai_provider: result.provider,
      ai_model: result.model,
      ai_fallback: result.fallback,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      duration_ms: Date.now() - t0,
    });
    return {
      scan_id,
      ticker_count: tickers.length,
      duration_ms: Date.now() - t0,
      status: "completed",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[portfolio-manager] scan ${scan_id} failed:`, msg);
    await markFailed(scan_id, msg);
    return {
      scan_id,
      ticker_count: tickers.length,
      duration_ms: Date.now() - t0,
      status: "failed",
    };
  }
}

async function markEmpty(scan_id: string, t0: number) {
  await markComplete(scan_id, {
    analyses: [],
    allocation: null,
    ai_provider: "none",
    ai_model: "none",
    ai_fallback: false,
    input_tokens: 0,
    output_tokens: 0,
    duration_ms: Date.now() - t0,
  });
}
