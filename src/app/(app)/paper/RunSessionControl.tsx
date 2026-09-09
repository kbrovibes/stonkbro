"use client";

import { useEffect, useState } from "react";
import { MetricBar, SegmentedSwitch } from "@/components/refresh";
import { invalidateCache } from "@/lib/client-cache";

type Session = "open" | "midday" | "close";

const SEGMENTS = [
  { key: "open", label: "OPEN" },
  { key: "midday", label: "MIDDAY" },
  { key: "close", label: "CLOSE" },
] as const;

/** A run that has not returned yet is assumed to take about this long. */
const EXPECTED_MS = 90_000;

interface RunSessionControlProps {
  onDone: () => void;
}

interface JobRow {
  kind: string;
  status: string;
  progress: string | null;
}

async function runningProgress(): Promise<string | null> {
  try {
    const res = await fetch("/api/jobs?limit=20", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { jobs?: JobRow[] };
    const job = data.jobs?.find((j) => j.kind === "paper-session" && j.status === "running");
    return job?.progress ?? null;
  } catch {
    return null;
  }
}

export default function RunSessionControl({ onDone }: RunSessionControlProps) {
  const [session, setSession] = useState<Session>("open");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = startedAt != null;

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(Date.now() - startedAt);
    tick();
    const clock = window.setInterval(tick, 500);
    const poll = window.setInterval(async () => setProgress(await runningProgress()), 2500);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
    };
  }, [running, startedAt]);

  async function run() {
    setStartedAt(Date.now());
    setResult(null);
    setError(null);
    setProgress(null);
    try {
      const res = await fetch("/api/paper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });
      const data = (await res.json()) as { error?: string; status?: string; ms?: number; errors?: string[]; traded?: boolean };
      if (!res.ok) throw new Error(data.error ?? `Run failed (${res.status})`);
      const secs = Math.max(1, Math.round((data.ms ?? 0) / 1000));
      const issues = data.errors?.length ? ` · ${data.errors.length} issue${data.errors.length === 1 ? "" : "s"}` : "";
      setResult(`${data.status?.toUpperCase() ?? "DONE"} IN ${secs}S${data.traded === false ? " · ALREADY RUN, RE-MARKED" : ""}${issues}`);
      invalidateCache("/api/paper");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setStartedAt(null);
    }
  }

  const label = running
    ? `RUNNING · ${(progress ?? "starting").toUpperCase()}`
    : error
      ? `FAILED · ${error.toUpperCase()}`
      : result ?? "ADMIN · RUN A SESSION NOW";
  const labelColor = running ? "var(--accent)" : error ? "var(--down)" : "var(--text-dim)";

  return (
    <section
      style={{
        margin: "0 var(--gutter)",
        padding: 14,
        borderRadius: 18,
        background: "var(--surface-1)",
        border: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <SegmentedSwitch segments={SEGMENTS} active={session} onChange={(k) => setSession(k)} aria-label="Session to run" />
      <MetricBar value={running ? Math.min(0.97, elapsed / EXPECTED_MS) : result ? 1 : 0} aria-label="Run progress" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span
          className="refresh-mono"
          style={{ fontSize: 11, letterSpacing: "0.1em", lineHeight: "16px", color: labelColor, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="refresh-mono refresh-pressable"
          style={{
            flex: "none",
            padding: "10px 16px",
            borderRadius: 12,
            border: "none",
            background: running ? "var(--surface-3)" : "var(--accent)",
            color: running ? "var(--text-subtle)" : "var(--text-inverse)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            lineHeight: "16px",
          }}
        >
          {running ? `${Math.floor(elapsed / 1000)}S` : "RUN SESSION"}
        </button>
      </div>
    </section>
  );
}
