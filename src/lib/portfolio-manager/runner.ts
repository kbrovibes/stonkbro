import { getStockHoldingsToday } from "./holdings";
import { enrichAll } from "./enrich";
import { analyzeAll } from "./analyst";
import {
  insertScan,
  markComplete,
  markFailed,
} from "@/lib/db/portfolio-manager-scans";

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

export async function runPortfolioManagerScan(opts: RunOptions): Promise<RunResult> {
  const t0 = Date.now();

  // 1. Holdings snapshot (cached daily)
  const { tickers, free_cash } = await getStockHoldingsToday();

  // 2. Insert scan row in 'running' state
  const scan_id = await insertScan({
    scan_type: opts.scan_type,
    trigger_source: opts.trigger_source,
    tickers,
  });

  // Empty portfolio short-circuit
  if (tickers.length === 0) {
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
    return { scan_id, ticker_count: 0, duration_ms: Date.now() - t0, status: "empty" };
  }

  try {
    // 3. Enrich in parallel (max 5 concurrent)
    const enrichments = await enrichAll(tickers.map((t) => t.symbol), 5);

    // 4. AI analyze + allocation (batched single call)
    const result = await analyzeAll(tickers, enrichments, free_cash, opts.userId);

    // 5. Persist
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
