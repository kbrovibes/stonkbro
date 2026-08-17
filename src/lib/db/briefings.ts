import { supabaseAdmin } from "@/lib/supabase";
import {
  BRIEFING_BUCKET,
  BRIEFING_HISTORY_DAYS,
  type BriefingTrigger,
  type DailyBriefing,
} from "@/lib/briefing/types";

const TABLE = "daily_briefings";

export async function insertBriefing(trigger: BriefingTrigger, briefingDate: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({
      trigger,
      briefing_date: briefingDate,
      status: "running",
      art_seed: Math.floor(Math.random() * 2_147_483_647),
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertBriefing: ${error.message}`);
  return (data as { id: string }).id;
}

export async function completeBriefing(
  id: string,
  patch: Partial<
    Pick<
      DailyBriefing,
      | "title"
      | "summary"
      | "transcript"
      | "highlights"
      | "actions"
      | "mood"
      | "audio_path"
      | "audio_bytes"
      | "audio_duration_s"
      | "voice"
      | "error_message"
    >
  >
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ ...patch, status: "completed" })
    .eq("id", id);
  if (error) throw new Error(`completeBriefing: ${error.message}`);
}

export async function failBriefing(id: string, message: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ status: "failed", error_message: message.slice(0, 500) })
    .eq("id", id);
  if (error) throw new Error(`failBriefing: ${error.message}`);
}

export async function getBriefingById(id: string): Promise<DailyBriefing | null> {
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getBriefingById: ${error.message}`);
  return data as DailyBriefing | null;
}

/**
 * Latest row per briefing_date, newest date first. A completed row beats a
 * failed/running one for the same date (a botched force-regenerate must not
 * hide yesterday's good briefing... or today's earlier good one).
 */
export async function getLatestBriefings(limit = BRIEFING_HISTORY_DAYS): Promise<DailyBriefing[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .order("briefing_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 4);
  if (error) throw new Error(`getLatestBriefings: ${error.message}`);

  const byDate = new Map<string, DailyBriefing>();
  for (const row of (data ?? []) as DailyBriefing[]) {
    const existing = byDate.get(row.briefing_date);
    if (!existing) {
      byDate.set(row.briefing_date, row);
      continue;
    }
    // Rows arrive newest-created first; only upgrade non-completed → completed.
    if (existing.status !== "completed" && row.status === "completed") {
      byDate.set(row.briefing_date, row);
    }
  }
  return [...byDate.values()].slice(0, limit);
}

export async function uploadBriefingAudio(path: string, buffer: Buffer): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BRIEFING_BUCKET)
    .upload(path, buffer, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`uploadBriefingAudio: ${error.message}`);
}

export async function downloadBriefingAudio(path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(BRIEFING_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Remove superseded rows (and their audio) after a successful regenerate. */
export async function deleteOlderBriefingsForDate(briefingDate: string, keepId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("id, audio_path")
    .eq("briefing_date", briefingDate)
    .neq("id", keepId);
  if (error || !data || data.length === 0) return;

  const paths = (data as { audio_path: string | null }[])
    .map((r) => r.audio_path)
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabaseAdmin.storage.from(BRIEFING_BUCKET).remove(paths);
  }
  await supabaseAdmin
    .from(TABLE)
    .delete()
    .eq("briefing_date", briefingDate)
    .neq("id", keepId);
}

/** Retention sweep: remove briefings (rows + audio) older than the history window. */
export async function deleteExpiredBriefings(days = BRIEFING_HISTORY_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("id, audio_path")
    .lt("briefing_date", cutoff);
  if (error || !data || data.length === 0) return 0;

  const paths = (data as { audio_path: string | null }[])
    .map((r) => r.audio_path)
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabaseAdmin.storage.from(BRIEFING_BUCKET).remove(paths);
  }
  await supabaseAdmin.from(TABLE).delete().lt("briefing_date", cutoff);
  return data.length;
}
