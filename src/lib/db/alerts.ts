import { supabaseAdmin } from "@/lib/supabase";

const TABLE = "alerts";

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertRow = {
  id: string;
  created_at: string;
  severity: AlertSeverity;
  kind: string;
  symbol: string | null;
  title: string;
  body: string;
  action: string | null;
  url: string;
  dedupe_key: string;
  acknowledged: boolean;
  pushed: boolean;
};

export type NewAlert = Omit<AlertRow, "id" | "created_at" | "acknowledged" | "pushed">;

/**
 * Insert alerts, silently skipping any whose dedupe_key already exists.
 * Returns the alerts that were actually inserted (i.e. new this run).
 */
export async function insertAlerts(alerts: NewAlert[]): Promise<AlertRow[]> {
  if (alerts.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert(alerts, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("*");
  if (error) throw new Error(`insertAlerts: ${error.message}`);
  return (data ?? []) as AlertRow[];
}

export async function markPushed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin.from(TABLE).update({ pushed: true }).in("id", ids);
  if (error) throw new Error(`markPushed: ${error.message}`);
}

export async function getRecentAlerts(hours: number, unackedOnly = false): Promise<AlertRow[]> {
  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  let q = supabaseAdmin
    .from(TABLE)
    .select("*")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(100);
  if (unackedOnly) q = q.eq("acknowledged", false);
  const { data, error } = await q;
  if (error) throw new Error(`getRecentAlerts: ${error.message}`);
  return (data ?? []) as AlertRow[];
}

export async function acknowledgeAlert(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).update({ acknowledged: true }).eq("id", id);
  if (error) throw new Error(`acknowledgeAlert: ${error.message}`);
}

export async function acknowledgeAllAlerts(): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ acknowledged: true })
    .eq("acknowledged", false);
  if (error) throw new Error(`acknowledgeAllAlerts: ${error.message}`);
}
