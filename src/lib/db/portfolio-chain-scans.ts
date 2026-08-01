import { supabaseAdmin } from "@/lib/supabase";
import type { OptionChain } from "@/lib/snaptrade/client";

const TABLE = "portfolio_chain_scans";

/**
 * The activities window the cache is computed from. The Portfolio page and
 * the cron both use this; requests for any other startDate bypass the cache
 * (chain grouping depends on the window, so windows aren't interchangeable).
 */
export const CHAIN_CACHE_START_DATE = "2025-01-01";

export type PortfolioChainScanRow = {
  id: string;
  created_at: string;
  scan_type: "scheduled" | "manual";
  start_date: string;
  chain_count: number;
  chains: OptionChain[];
  status: "running" | "completed" | "failed";
  error_message: string | null;
  duration_ms: number | null;
};

export async function insertChainScan(scanType: "scheduled" | "manual"): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ scan_type: scanType, start_date: CHAIN_CACHE_START_DATE, status: "running" })
    .select("id")
    .single();
  if (error) throw new Error(`insertChainScan: ${error.message}`);
  return (data as { id: string }).id;
}

export async function markChainScanComplete(
  id: string,
  payload: { chains: OptionChain[]; duration_ms: number }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({
      chains: payload.chains,
      chain_count: payload.chains.length,
      duration_ms: payload.duration_ms,
      status: "completed",
    })
    .eq("id", id);
  if (error) throw new Error(`markChainScanComplete: ${error.message}`);
}

export async function markChainScanFailed(id: string, message: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ status: "failed", error_message: message.slice(0, 500) })
    .eq("id", id);
  if (error) throw new Error(`markChainScanFailed: ${error.message}`);
}

/** Latest completed scan for the cache window, no older than maxAgeHours, or null. */
export async function getLatestChainScan(maxAgeHours: number): Promise<PortfolioChainScanRow | null> {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("status", "completed")
    .eq("start_date", CHAIN_CACHE_START_DATE)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestChainScan: ${error.message}`);
  return data as PortfolioChainScanRow | null;
}
