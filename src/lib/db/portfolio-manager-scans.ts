import { supabaseAdmin } from "@/lib/supabase";
import type {
  PortfolioAllocation,
  PortfolioScanRow,
  TickerAnalysis,
  TickerSnapshot,
} from "@/lib/portfolio-manager/types";

const TABLE = "portfolio_manager_scans";

export async function insertScan(params: {
  scan_type: "scheduled" | "manual";
  trigger_source: string | null;
  tickers: TickerSnapshot[];
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({
      scan_type: params.scan_type,
      trigger_source: params.trigger_source,
      status: "running",
      tickers: params.tickers,
      ticker_count: params.tickers.length,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertScan: ${error.message}`);
  return (data as { id: string }).id;
}

export async function markComplete(
  id: string,
  payload: {
    analyses: TickerAnalysis[];
    allocation: PortfolioAllocation | null;
    ai_provider: string;
    ai_model: string;
    ai_fallback: boolean;
    input_tokens: number;
    output_tokens: number;
    duration_ms: number;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      analyses: payload.analyses,
      allocation: payload.allocation,
      ai_provider: payload.ai_provider,
      ai_model: payload.ai_model,
      ai_fallback: payload.ai_fallback,
      input_tokens: payload.input_tokens,
      output_tokens: payload.output_tokens,
      duration_ms: payload.duration_ms,
    })
    .eq("id", id);
  if (error) throw new Error(`markComplete: ${error.message}`);
}

export async function markFailed(id: string, error: string): Promise<void> {
  const { error: err } = await supabaseAdmin
    .from(TABLE)
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error,
    })
    .eq("id", id);
  if (err) console.error(`markFailed: ${err.message}`);
}

export async function getLatestCompleted(): Promise<PortfolioScanRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`getLatestCompleted: ${error.message}`);
    return null;
  }
  return data as PortfolioScanRow | null;
}

export async function getRunningWithin(minutes: number): Promise<{ id: string; created_at: string } | null> {
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("id, created_at")
    .eq("status", "running")
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`getRunningWithin: ${error.message}`);
    return null;
  }
  return data as { id: string; created_at: string } | null;
}
