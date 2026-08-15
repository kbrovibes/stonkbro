export type JobTrigger = "manual" | "cron" | "auto";
export type JobStatus = "running" | "completed" | "failed" | "cancelled";

export interface JobRecord {
  id: string;
  kind: string;
  label: string;
  trigger: JobTrigger;
  status: JobStatus;
  progress: string | null;
  error: string | null;
  meta: Record<string, unknown> | null;
  cancel_requested: boolean;
  created_by: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}

/** Thrown inside a tracked job to end it with status "cancelled". */
export class JobCancelledError extends Error {
  constructor(message = "Cancelled by user") {
    super(message);
    this.name = "JobCancelledError";
  }
}
