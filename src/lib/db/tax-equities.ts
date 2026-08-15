import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import type { EquitySaleEvent } from "@/lib/taxes/equities";

export type TaxEquityScanRow = {
  id: string;
  status: "running" | "completed" | "failed";
  events: EquitySaleEvent[] | null;
  meta: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
};

/** Latest completed equity scan (any age — the UI shows staleness). */
export async function getLatestEquityScan(): Promise<TaxEquityScanRow | null> {
  const { data, error } = await supabaseAdmin
    .from("tax_equity_scans")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as TaxEquityScanRow) ?? null;
}

export async function insertEquityScan(
  events: EquitySaleEvent[],
  meta: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tax_equity_scans")
    .insert({ status: "completed", events, meta });
  if (error) throw error;
}

export type BasisOverrideRow = {
  id: string;
  user_id: string;
  event_key: string;
  cost_basis: number;
  acquired_date: string;
  note: string | null;
  created_at: string;
};

export async function listBasisOverrides(userId: string): Promise<BasisOverrideRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_basis_overrides")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BasisOverrideRow[];
}

export async function upsertBasisOverride(
  userId: string,
  override: { event_key: string; cost_basis: number; acquired_date: string; note?: string | null }
): Promise<BasisOverrideRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_basis_overrides")
    .upsert(
      {
        user_id: userId,
        event_key: override.event_key,
        cost_basis: override.cost_basis,
        acquired_date: override.acquired_date,
        note: override.note ?? null,
      },
      { onConflict: "user_id,event_key" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as BasisOverrideRow;
}

export async function deleteBasisOverride(userId: string, eventKey: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tax_basis_overrides")
    .delete()
    .eq("user_id", userId)
    .eq("event_key", eventKey);
  if (error) throw error;
}
