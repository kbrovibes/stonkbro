"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ExplosivePick = {
  symbol: string;
  thesis: string;
  catalyst: string;
  risk: string;
  entryStrategy: string;
  conviction: string;
};

export type Result = {
  report: string;
  picks: ExplosivePick[];
  sector: string;
  tickersAnalyzed: string[];
  timestamp: string;
  cached?: boolean;
  scannedAt?: string;
};

export type ScanStatus = "idle" | "loading-cache" | "running" | "done" | "error";

export type ScanState = {
  status: ScanStatus;
  data?: Result;
  error?: string;
  cached?: boolean;
  scannedAt?: string;
};

export type ResearchAllProgress = {
  running: boolean;
  current: number;
  total: number;
};

/**
 * Per-selection scan state, keyed by dropdown value. Selections are fully
 * independent: a run in flight for one selection never blocks another, and
 * each result lands under its own key when its request resolves.
 */
export function useExplosiveScans(selections: string[]) {
  const [scans, setScans] = useState<Record<string, ScanState>>({});
  const [researchAll, setResearchAll] = useState<ResearchAllProgress | null>(null);

  const scansRef = useRef(scans);
  scansRef.current = scans;
  const cacheCheckedRef = useRef<Set<string>>(new Set());
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      // Stop the Research All loop on navigation; in-flight requests still
      // complete server-side and land in the server cache.
      cancelledRef.current = true;
    };
  }, []);

  const update = useCallback((selection: string, patch: Partial<ScanState>) => {
    setScans((prev) => ({
      ...prev,
      [selection]: { ...(prev[selection] ?? { status: "idle" }), ...patch },
    }));
  }, []);

  /** One-time cached-result lookup for a selection. Never triggers a scan. */
  const loadCache = useCallback(
    async (selection: string) => {
      if (cacheCheckedRef.current.has(selection)) return;
      cacheCheckedRef.current.add(selection);
      update(selection, { status: "loading-cache" });
      try {
        const res = await fetch(`/api/explosive?sector=${encodeURIComponent(selection)}`);
        const data = await res.json();
        if (res.ok && data.report) {
          update(selection, {
            status: "done",
            data: data as Result,
            cached: true,
            scannedAt: data.scannedAt ?? data.timestamp,
            error: undefined,
          });
        } else {
          update(selection, { status: "idle" });
        }
      } catch {
        update(selection, { status: "idle" });
      }
    },
    [update]
  );

  /** Run a scan for one selection. refresh=true bypasses the server cache. */
  const runScan = useCallback(
    async (selection: string, refresh: boolean): Promise<boolean> => {
      if (scansRef.current[selection]?.status === "running") return false;
      cacheCheckedRef.current.add(selection);
      update(selection, { status: "running", error: undefined });
      try {
        const res = await fetch(`/api/explosive${refresh ? "?refresh=1" : ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sector: selection === "all" ? undefined : selection,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Request failed with status ${res.status}`);
        }
        update(selection, {
          status: "done",
          data: data as Result,
          cached: !!data.cached,
          scannedAt: data.scannedAt ?? data.timestamp,
          error: undefined,
        });
        return true;
      } catch (e) {
        update(selection, {
          status: "error",
          error: e instanceof Error ? e.message : "Unknown error",
        });
        return false;
      }
    },
    [update]
  );

  /**
   * Research All: run every selection sequentially (each scan is its own AI
   * call — parallel would blow rate limits). Fresh cached selections resolve
   * instantly since the server serves its cache for non-refresh runs.
   */
  const runAll = useCallback(async () => {
    if (researchAll?.running) return;
    setResearchAll({ running: true, current: 0, total: selections.length });
    for (let i = 0; i < selections.length; i++) {
      if (cancelledRef.current) break;
      setResearchAll({ running: true, current: i + 1, total: selections.length });
      await runScan(selections[i], false);
    }
    if (!cancelledRef.current) setResearchAll(null);
  }, [researchAll, selections, runScan]);

  return { scans, researchAll, loadCache, runScan, runAll };
}

/** "scanned 5h ago"-style age label. */
export function formatAge(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
