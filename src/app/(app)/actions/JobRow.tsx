"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobRecord, JobTrigger } from "@/lib/jobs/types";
import { formatDuration, relativeTime } from "./time";

export type JobWithCancel = JobRecord & { cancellable: boolean; href: string | null };

const TRIGGER_BADGE: Record<JobTrigger, string> = {
  cron:   "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  manual: "bg-sky-100 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
  auto:   "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
};

function StatusDot({ job }: { job: JobWithCancel }) {
  if (job.status === "running") {
    return <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse flex-shrink-0" />;
  }
  if (job.status === "completed") {
    return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />;
  }
  if (job.status === "failed") {
    return <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />;
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-stone-400 dark:bg-text-faint flex-shrink-0" />;
}

export default function JobRow({
  job,
  now,
  cancelPending,
  onCancel,
}: {
  job: JobWithCancel;
  now: number;
  cancelPending: boolean;
  onCancel: (id: string) => void;
}) {
  const [errorExpanded, setErrorExpanded] = useState(false);
  const router = useRouter();

  const isRunning = job.status === "running";
  const cancelling = isRunning && (job.cancel_requested || cancelPending);
  const startedMs = new Date(job.started_at).getTime();
  const clickable = !!job.href;

  return (
    <div
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => router.push(job.href!) : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter") router.push(job.href!); } : undefined}
      className={`bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-xl px-4 py-3 ${
        clickable ? "cursor-pointer hover:border-stone-200 dark:hover:border-border-default active:bg-stone-50 dark:active:bg-surface-muted transition-colors" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-1.5">
          <StatusDot job={job} />
        </div>

        {/* Fixed-width trigger column keeps every row's badge aligned */}
        <span
          className={`mt-0.5 w-[52px] text-center rounded px-0 py-0.5 text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${TRIGGER_BADGE[job.trigger] ?? TRIGGER_BADGE.auto}`}
        >
          {job.trigger}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-stone-900 dark:text-text truncate">{job.label}</p>
            {clickable && (
              <span className="text-stone-300 dark:text-text-faint text-xs flex-shrink-0">›</span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 dark:text-text-faint">{job.kind}</p>

          <p className="text-xs text-stone-500 dark:text-text-subtle mt-1 tabular-nums">
            {relativeTime(job.started_at, now)}
            {isRunning && <> · running {formatDuration(now - startedMs)}</>}
            {!isRunning && job.duration_ms != null && <> · {formatDuration(job.duration_ms)}</>}
          </p>

          {isRunning && job.progress && (
            <p className="text-xs text-sky-600 dark:text-accent-hover mt-1">{job.progress}</p>
          )}

          {job.status === "failed" && job.error && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setErrorExpanded((v) => !v); }}
              className={`text-left text-xs text-rose-600 dark:text-loss mt-1 break-words ${errorExpanded ? "" : "line-clamp-2"}`}
            >
              {job.error}
            </button>
          )}

          {job.status === "cancelled" && (
            <p className="text-xs text-stone-500 dark:text-text-subtle mt-1">Cancelled</p>
          )}
        </div>

        {isRunning && job.cancellable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCancel(job.id); }}
            disabled={cancelling}
            className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
              cancelling
                ? "bg-stone-100 dark:bg-surface-muted text-stone-400 dark:text-text-faint cursor-default"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100"
            }`}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
