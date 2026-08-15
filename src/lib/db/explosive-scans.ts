import { supabaseAdmin } from "@/lib/supabase";

const TABLE = "explosive_scans";

export type ExplosivePick = {
  symbol: string;
  thesis: string;
  catalyst: string;
  risk: string;
  entryStrategy: string;
  conviction: string;
};

export type ExplosiveScanResults = {
  report: string;
  picks: ExplosivePick[];
  sector: string;
  tickersAnalyzed: string[];
  reportId: string | null;
};

export type ExplosiveScanRow = {
  id: string;
  created_at: string;
  selection: string;
  results: ExplosiveScanResults;
  status: "completed" | "failed";
  error: string | null;
};

/** Latest completed scan for a dropdown selection, no older than maxAgeHours, or null. */
export async function getLatestExplosiveScan(
  selection: string,
  maxAgeHours: number
): Promise<ExplosiveScanRow | null> {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("selection", selection)
    .eq("status", "completed")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestExplosiveScan: ${error.message}`);
  return data as ExplosiveScanRow | null;
}

export async function insertExplosiveScan(
  selection: string,
  results: ExplosiveScanResults
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ selection, results, status: "completed" })
    .select("id")
    .single();
  if (error) throw new Error(`insertExplosiveScan: ${error.message}`);
  return (data as { id: string }).id;
}
