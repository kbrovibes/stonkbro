"use client";

/**
 * Determinate progress for a scan that only resolves when it is finished.
 *
 * The scan endpoints return once, at the end. What they do leave behind is a
 * row in `app_jobs`: `/api/jobs` carries the running job's `progress` string,
 * its `meta.tickers`, and the duration of every completed run of the same
 * kind. So:
 *
 * - **PMCC** writes `SYMBOL (n/total)` as it goes, so its count is REAL —
 *   parsed straight out of the running job.
 * - **CSP Hunter** writes a phase name, not a count. Its bar is an ESTIMATE,
 *   driven by elapsed time against the median duration of past runs, and the
 *   screen labels it as one. It never shows a chain count it does not have.
 *
 * The elapsed clock is always real: it is measured locally from the moment
 * the request left.
 */

import { useCallback, useEffect, useState } from "react";

export type ScanKind = "csp-hunter-scan" | "pmcc-scan";

/** Used only until this device has seen a scan of its own finish. */
const FALLBACK_MS: Record<ScanKind, number> = {
  "csp-hunter-scan": 45_000,
  "pmcc-scan": 60_000,
};

/** A scan never shows as finished until it actually returns. */
const CEILING = 0.97;

interface JobRow {
  kind: string;
  status: string;
  progress: string | null;
  duration_ms: number | null;
  meta: Record<string, unknown> | null;
}

export interface ScanTelemetry {
  /** Chains examined so far. `null` when the job does not report one. */
  scanned: number | null;
  /** Chains in this scan's universe. `null` until a job has reported one. */
  total: number | null;
  /** True when `scanned` / the bar are inferred from elapsed time. */
  estimated: boolean;
  /** 0–1, always determinate. */
  fraction: number;
  elapsedMs: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** A progress string like `SYM (7/20)` → 7 and 20. Anything else → null. */
function parseCount(progress: string | null): { scanned: number; total: number } | null {
  if (!progress) return null;
  const m = /\((\d+)\s*\/\s*(\d+)\)/.exec(progress);
  if (!m) return null;
  const scanned = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(scanned) || !Number.isFinite(total) || total <= 0) return null;
  return { scanned, total };
}

async function loadJobs(): Promise<JobRow[] | null> {
  try {
    const res = await fetch("/api/jobs?limit=100", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { jobs?: JobRow[] };
    return data.jobs ?? [];
  } catch {
    return null;
  }
}

/**
 * @param kind      which job the current strategy runs
 * @param running   true while the request is in flight
 * @param startedAt timestamp the request left, or null
 */
export function useScanTelemetry(
  kind: ScanKind,
  running: boolean,
  startedAt: number | null
): ScanTelemetry {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [live, setLive] = useState<{ scanned: number; total: number } | null>(null);
  const [expectedMs, setExpectedMs] = useState<number | null>(null);
  const [knownTotal, setKnownTotal] = useState<number | null>(null);

  // History: the median duration of past runs, and the universe size the last
  // run reported. Best-effort — signed-out or a failed request just means the
  // fallback estimate, never a broken screen.
  const readHistory = useCallback(async () => {
    const jobs = await loadJobs();
    if (!jobs) return;
    const mine = jobs.filter((j) => j.kind === kind);
    const durations = mine
      .filter((j) => j.status === "completed" && typeof j.duration_ms === "number")
      .map((j) => j.duration_ms as number)
      .slice(0, 10);
    setExpectedMs(median(durations));
    const withTickers = mine.find((j) => typeof j.meta?.tickers === "number");
    if (withTickers) setKnownTotal(withTickers.meta!.tickers as number);
  }, [kind]);

  useEffect(() => {
    readHistory();
  }, [readHistory]);

  // The clock. Local, real, and the only thing on this block that is certain.
  useEffect(() => {
    if (!running || startedAt == null) return;
    setElapsedMs(Date.now() - startedAt);
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 500);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  // Live job row, for the kinds that report a count.
  useEffect(() => {
    if (!running) {
      setLive(null);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const jobs = await loadJobs();
      if (cancelled || !jobs) return;
      const job = jobs.find((j) => j.kind === kind && j.status === "running");
      if (!job) return;
      if (typeof job.meta?.tickers === "number") setKnownTotal(job.meta.tickers as number);
      setLive(parseCount(job.progress));
    };
    poll();
    const id = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [running, kind]);

  // Refresh the median once a run of our own has landed.
  useEffect(() => {
    if (running || startedAt == null) return;
    readHistory();
  }, [running, startedAt, readHistory]);

  if (live) {
    return {
      scanned: live.scanned,
      total: live.total,
      estimated: false,
      fraction: Math.min(CEILING, live.scanned / live.total),
      elapsedMs,
    };
  }

  const expected = expectedMs ?? FALLBACK_MS[kind];
  return {
    scanned: null,
    total: knownTotal,
    estimated: true,
    fraction: running ? Math.min(CEILING, elapsedMs / expected) : 0,
    elapsedMs,
  };
}

/** `00:04`. */
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
