"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JobRow, { type JobWithCancel } from "./JobRow";
import { dayKey, dayLabel } from "./time";

type Filter = "all" | "running" | "completed" | "failed";

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["running", "Running"],
  ["completed", "Completed"],
  ["failed", "Failed"],
];

function matchesFilter(job: JobWithCancel, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "failed") return job.status === "failed" || job.status === "cancelled";
  return job.status === filter;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithCancel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [cancelPending, setCancelPending] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());

  const fetchJobs = useCallback((initial = false) => {
    if (initial) setLoading(true);
    fetch("/api/jobs?limit=150")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) throw new Error("Access restricted");
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load (${r.status})`);
        }
        return r.json();
      })
      .then((d: { jobs: JobWithCancel[] }) => {
        setJobs(d.jobs);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  const anyRunning = useMemo(() => (jobs ?? []).some((j) => j.status === "running"), [jobs]);

  // Auto-refresh: 10s while anything is running, else 60s; skip when hidden.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchJobs();
    }, anyRunning ? 10_000 : 60_000);
    const onFocus = () => fetchJobs();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [anyRunning, fetchJobs]);

  // One shared 1s ticker for live elapsed timers while anything runs.
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyRunning]);

  const handleCancel = useCallback((id: string) => {
    setCancelPending((prev) => new Set(prev).add(id));
    fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", id }),
    })
      .then(() => fetchJobs())
      .catch(() => {
        // Leave the pending flag — the next poll reconciles actual state.
      });
  }, [fetchJobs]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 bg-stone-100 dark:bg-surface-muted rounded-lg animate-pulse w-40" />
        <div className="h-7 bg-stone-100 dark:bg-surface-muted rounded-full animate-pulse w-64" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-stone-100 dark:bg-surface-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !jobs) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-8 text-center">
        <div className="text-3xl">🔒</div>
        <p className="text-stone-700 dark:text-text-muted font-medium">{error ?? "No data"}</p>
        {error === "Access restricted" && (
          <p className="text-xs text-stone-400 dark:text-text-faint">Sign in to see your background jobs.</p>
        )}
      </div>
    );
  }

  const visible = jobs.filter((j) => matchesFilter(j, filter));

  // Group by local calendar day (API returns newest first).
  const groups: { key: string; label: string; jobs: JobWithCancel[] }[] = [];
  for (const job of visible) {
    const key = dayKey(job.started_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.jobs.push(job);
    else groups.push({ key, label: dayLabel(job.started_at, now), jobs: [job] });
  }

  return (
    <div className="flex flex-col pb-8">
      <div className="p-4 pb-2">
        <h1 className="text-xl font-bold text-stone-900 dark:text-text">Actions</h1>
        <p className="text-xs text-stone-400 dark:text-text-faint">
          Everything running or recently run across the app — tap one to see its output
        </p>
      </div>

      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <StatCard
          label="Running"
          count={jobs.filter((j) => j.status === "running").length}
          tone="running"
          active={filter === "running"}
          onClick={() => setFilter(filter === "running" ? "all" : "running")}
        />
        <StatCard
          label="Completed"
          count={jobs.filter((j) => j.status === "completed").length}
          tone="ok"
          active={filter === "completed"}
          onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
        />
        <StatCard
          label="Failed"
          count={jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length}
          tone="bad"
          active={filter === "failed"}
          onClick={() => setFilter(filter === "failed" ? "all" : "failed")}
        />
      </div>

      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === key
                ? "bg-stone-800 text-white"
                : "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle hover:bg-stone-200 dark:hover:bg-surface-sunken"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 p-8 text-center">
          <p className="text-sm text-stone-500 dark:text-text-subtle font-medium">
            {jobs.length === 0
              ? "Nothing yet — scans and refreshes you trigger will show up here."
              : "Nothing matches this filter."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="sticky top-16 z-10 px-4 py-1.5 bg-surface/95 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint">
                  {group.label}
                </p>
              </div>
              <div className="px-4 pb-3 flex flex-col gap-2">
                {group.jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    now={now}
                    cancelPending={cancelPending.has(job.id)}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  tone: "running" | "ok" | "bad";
  active: boolean;
  onClick: () => void;
}) {
  const countClass =
    tone === "running"
      ? "text-sky-600 dark:text-accent-hover"
      : tone === "ok"
        ? "text-emerald-600 dark:text-gain"
        : "text-rose-600 dark:text-loss";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white dark:bg-surface-elevated border rounded-xl px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-stone-400 dark:border-border-default ring-1 ring-stone-300 dark:ring-border-default"
          : "border-stone-100 dark:border-border-subtle"
      }`}
    >
      <p className={`text-lg font-bold tabular-nums leading-tight ${countClass} ${tone === "running" && count > 0 ? "animate-pulse" : ""}`}>
        {count}
      </p>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint">
        {label}
      </p>
    </button>
  );
}
