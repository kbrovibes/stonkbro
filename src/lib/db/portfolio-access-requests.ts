import { supabaseAdmin } from "@/lib/supabase";

const TABLE = "portfolio_access_requests";

export type AccessStatus = "pending" | "approved" | "denied";

export interface AccessRequestRow {
  id: string;
  user_id: string;
  status: AccessStatus;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

/** The caller's own request, or null if they've never asked. */
export async function getAccessRequest(userId: string): Promise<AccessRequestRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getAccessRequest: ${error.message}`);
  return data as AccessRequestRow | null;
}

/** Create a request, or reset an existing one back to pending (re-request after a denial). */
export async function requestAccess(userId: string): Promise<AccessRequestRow> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert(
      { user_id: userId, status: "pending", requested_at: new Date().toISOString(), decided_at: null, decided_by: null },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`requestAccess: ${error.message}`);
  return data as AccessRequestRow;
}

export async function listPendingRequests(): Promise<AccessRequestRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error) throw new Error(`listPendingRequests: ${error.message}`);
  return (data ?? []) as AccessRequestRow[];
}

export async function decideAccessRequest(
  userId: string,
  decision: "approved" | "denied",
  decidedBy: string
): Promise<AccessRequestRow> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({ status: decision, decided_at: new Date().toISOString(), decided_by: decidedBy })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`decideAccessRequest: ${error.message}`);
  return data as AccessRequestRow;
}
