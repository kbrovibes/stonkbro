import { supabaseAdmin } from "@/lib/supabase";
import type { BloodbathTicker } from "@/lib/analysis/bloodbath";
import type { BloodbathVerdict } from "@/lib/analysis/bloodbath-verdict";

const TABLE = "bloodbath_scans";

export type BloodbathScanRow = {
  id: string;
  created_at: string;
  scan_type: "scheduled" | "manual";
  scanned_count: number;
  watchlist: BloodbathTicker[];
  market: BloodbathTicker[];
  verdicts: BloodbathVerdict[] | null;
  ai_provider: string | null;
  ai_model: string | null;
  status: "running" | "completed" | "failed";
  error_message: string | null;
  duration_ms: number | null;
};

export async function insertScan(scanType: "scheduled" | "manual"): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ scan_type: scanType, status: "running" })
    .select("id")
    .single();
  if (error) throw new Error(`insertScan: ${error.message}`);
  return (data as { id: string }).id;
}

export async function markComplete(
  id: string,
  payload: {
    scanned_count: number;
    watchlist: BloodbathTicker[];
    market: BloodbathTicker[];
    verdicts: BloodbathVerdict[] | null;
    ai_provider: string | null;
    ai_model: string | null;
    duration_ms: number;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ status: "completed", ...payload })
    .eq("id", id);
  if (error) throw new Error(`markComplete: ${error.message}`);
}

export async function markFailed(id: string, message: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ status: "failed", error_message: message.slice(0, 500) })
    .eq("id", id);
  if (error) throw new Error(`markFailed: ${error.message}`);
}

/** Latest completed scan no older than maxAgeHours, or null. */
export async function getLatestScan(maxAgeHours: number): Promise<BloodbathScanRow | null> {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("status", "completed")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestScan: ${error.message}`);
  return data as BloodbathScanRow | null;
}

/** Union of every user's watchlist symbols — for the cron, which has no user session. */
export async function getAllUsersWatchlistSymbols(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("watchlist_items").select("symbol");
  if (error) throw new Error(`getAllUsersWatchlistSymbols: ${error.message}`);
  return [...new Set((data as { symbol: string }[]).map((d) => d.symbol))];
}
