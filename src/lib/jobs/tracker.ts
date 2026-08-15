/**
 * Job lifecycle tracking. Every function here is best-effort: tracking must
 * never break the operation it wraps, so failures log and return quietly.
 * Writes use the service-role client — crons have no user session.
 */
import { supabaseAdmin } from "@/lib/supabase";
import { JobCancelledError, type JobRecord, type JobTrigger } from "./types";

// A serverless function that dies (timeout, crash, deploy) can't mark its
// job finished. Anything "running" longer than this is swept to failed.
const STALE_AFTER_MINUTES = 15;

export interface StartJobOptions {
  kind: string;
  label: string;
  trigger: JobTrigger;
  meta?: Record<string, unknown>;
  createdBy?: string | null;
}

export async function startJob(opts: StartJobOptions): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_jobs")
      .insert({
        kind: opts.kind,
        label: opts.label,
        trigger: opts.trigger,
        meta: opts.meta ?? null,
        created_by: opts.createdBy ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  } catch (e) {
    console.error("jobs: startJob failed", e);
    return null;
  }
}

async function finish(
  id: string,
  patch: { status: string; error?: string | null; progress?: string | null; meta?: Record<string, unknown> }
): Promise<void> {
  try {
    const { data } = await supabaseAdmin.from("app_jobs").select("started_at, meta").eq("id", id).single();
    const startedAt = data?.started_at ? Date.parse(data.started_at) : Date.now();
    await supabaseAdmin
      .from("app_jobs")
      .update({
        status: patch.status,
        error: patch.error ?? null,
        ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
        ...(patch.meta ? { meta: { ...(data?.meta ?? {}), ...patch.meta } } : {}),
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", id);
  } catch (e) {
    console.error("jobs: finish failed", e);
  }
}

export async function completeJob(id: string | null, meta?: Record<string, unknown>): Promise<void> {
  if (id) await finish(id, { status: "completed", meta });
}

export async function failJob(id: string | null, error: string): Promise<void> {
  if (id) await finish(id, { status: "failed", error });
}

export async function markCancelled(id: string | null): Promise<void> {
  if (id) await finish(id, { status: "cancelled" });
}

export async function setJobProgress(id: string | null, progress: string): Promise<void> {
  if (!id) return;
  try {
    await supabaseAdmin.from("app_jobs").update({ progress }).eq("id", id);
  } catch (e) {
    console.error("jobs: setJobProgress failed", e);
  }
}

export async function isCancelRequested(id: string | null): Promise<boolean> {
  if (!id) return false;
  try {
    const { data } = await supabaseAdmin.from("app_jobs").select("cancel_requested").eq("id", id).single();
    return !!data?.cancel_requested;
  } catch {
    return false;
  }
}

export async function requestCancel(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("app_jobs")
      .update({ cancel_requested: true })
      .eq("id", id)
      .eq("status", "running");
    return !error;
  } catch {
    return false;
  }
}

/** Mark long-stuck "running" rows failed. Called from the jobs API on read. */
export async function sweepStaleJobs(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();
    await supabaseAdmin
      .from("app_jobs")
      .update({
        status: "failed",
        error: `Lost — no completion after ${STALE_AFTER_MINUTES} min (function timed out, crashed, or was redeployed)`,
        finished_at: new Date().toISOString(),
      })
      .eq("status", "running")
      .lt("started_at", cutoff);
  } catch (e) {
    console.error("jobs: sweepStaleJobs failed", e);
  }
}

export async function listJobs(limit = 100): Promise<{ jobs: JobRecord[]; running: number }> {
  const [listRes, countRes] = await Promise.all([
    supabaseAdmin.from("app_jobs").select("*").order("started_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("app_jobs").select("id", { count: "exact", head: true }).eq("status", "running"),
  ]);
  if (listRes.error) throw listRes.error;
  return { jobs: (listRes.data ?? []) as JobRecord[], running: countRes.count ?? 0 };
}

export interface JobContext {
  jobId: string | null;
  /** Throws JobCancelledError if a cancel was requested. Call between units of work. */
  checkCancelled: () => Promise<void>;
  progress: (text: string) => Promise<void>;
}

/**
 * Wrap an operation in job tracking. Completes/fails/cancels the row based
 * on the outcome; the operation's result/throw passes through untouched
 * (except JobCancelledError, which resolves to `onCancelled` if provided).
 */
export async function runTracked<T>(
  opts: StartJobOptions,
  fn: (ctx: JobContext) => Promise<T>,
  onCancelled?: () => T
): Promise<T> {
  const jobId = await startJob(opts);
  const ctx: JobContext = {
    jobId,
    checkCancelled: async () => {
      if (await isCancelRequested(jobId)) throw new JobCancelledError();
    },
    progress: (text: string) => setJobProgress(jobId, text),
  };
  try {
    const result = await fn(ctx);
    await completeJob(jobId);
    return result;
  } catch (e) {
    if (e instanceof JobCancelledError) {
      await markCancelled(jobId);
      if (onCancelled) return onCancelled();
      throw e;
    }
    await failJob(jobId, e instanceof Error ? e.message : String(e));
    throw e;
  }
}
