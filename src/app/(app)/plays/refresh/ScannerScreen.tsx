"use client";

/**
 * Scanner — the refresh design's Options screen.
 *
 * The structural change from the five-tab scanner it replaces: `strategy` and
 * `sector` live here, in one parent. Switching strategy re-queries against the
 * sector you already picked and leaves you where you were scrolled to; it does
 * not navigate. The five strategies stop being five destinations.
 *
 * Where each strategy's data comes from — all existing endpoints, called, not
 * changed:
 *
 * | segment | source                                    | sector filter |
 * |---------|-------------------------------------------|---------------|
 * | CSP     | GET /api/csp-hunter → candidates           | client-side   |
 * | CALLS   | GET /api/csp-hunter → callCandidates       | client-side   |
 * | PMCC    | <PmccIncome /> — GET /api/pmcc-income     | none          |
 * | LEAPS   | <LeapsLab /> — GET /api/leaps             | none          |
 * | WKLY    | GET /api/csp-hunter/weekly-recap          | client-side   |
 *
 * CSP Hunter scans one universe for all three of its sections in a single
 * run, so the sector chips filter its results rather than narrowing the scan —
 * narrowing it would write a sector-limited scan into the shared history the
 * existing /plays reads. LEAPS and PMCC are decision tools on the daily
 * LEAPS + PMCC scan (spec 59); they own the screen below the switch.
 *
 * `/plays?s=leaps` deep-links a segment. `useSearchParams` needs a Suspense
 * boundary, which is the only reason the default export is a wrapper.
 */

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChipRow, SegmentedSwitch } from "@/components/refresh";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";
import LeapsLab from "./leaps/LeapsLab";
import PmccIncome from "./pmcc/PmccIncome";
import ScanStatusBlock, { type ScanState } from "./ScanStatusBlock";
import SetupCard, { SetupCardSkeleton } from "./SetupCard";
import { useFlipList } from "./useFlipList";
import { useScanTelemetry, type ScanKind } from "./useScanTelemetry";
import {
  barFill,
  callSetup,
  cspSetup,
  fitsCapital,
  fmtCompactMoney,
  inSector,
  pmccSetup,
  rankSetups,
  SECTOR_CHIPS,
  STRATEGIES,
  weeklySetup,
  type CspCandidate,
  type LongCallCandidate,
  type PmccSetup,
  type SectorKey,
  type Setup,
  type Strategy,
  type WeeklyPick,
} from "./scanner-data";

interface ScanRecord {
  id: string;
  createdAt: string;
  capital: number;
  candidates: CspCandidate[];
  callCandidates: LongCallCandidate[];
  leapsCandidates: LongCallCandidate[];
}

interface PmccRun {
  setups: PmccSetup[];
  total: number;
  at: number;
  durationMs: number;
}

const HEADINGS: Record<Strategy, string> = {
  csp: "Ranked by monthly ROC",
  calls: "Ranked by setup score",
  pmcc: "Ranked by monthly ROC",
  leaps: "Ranked by setup score",
  wkly: "This week's picks",
};

const SCAN_KIND: Record<Strategy, ScanKind> = {
  csp: "csp-hunter-scan",
  calls: "csp-hunter-scan",
  pmcc: "pmcc-scan",
  leaps: "csp-hunter-scan",
  wkly: "csp-hunter-scan",
};

const GUTTER = 22;

/** iOS Safari has no Vibration API; this simply does nothing there. */
function haptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* no-op */
  }
}

function ago(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isStrategy(s: string | null): s is Strategy {
  return STRATEGIES.some((x) => x.key === s);
}

function StrategyFromUrl() {
  const s = useSearchParams().get("s");
  return <ScannerScreenInner initialStrategy={isStrategy(s) ? s : "csp"} />;
}

export default function ScannerScreen() {
  return (
    <Suspense fallback={<ScannerScreenInner initialStrategy="csp" />}>
      <StrategyFromUrl />
    </Suspense>
  );
}

function ScannerScreenInner({ initialStrategy }: { initialStrategy: Strategy }) {
  const [strategy, setStrategy] = useState<Strategy>(initialStrategy);
  const [sector, setSector] = useState<SectorKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fitsOnly, setFitsOnly] = useState(true);

  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [weekly, setWeekly] = useState<{ picks: WeeklyPick[]; weekStart: string | null } | null>(null);
  const [pmccBySector, setPmccBySector] = useState<Record<string, PmccRun>>({});

  const [busy, setBusy] = useState<{ strategy: Strategy; startedAt: number } | null>(null);
  const [failed, setFailed] = useState<Strategy | null>(null);
  const [lastRun, setLastRun] = useState<Partial<Record<Strategy, number>>>({});

  /* ---- data ---------------------------------------------------------- */

  const loadScans = useCallback(async (fresh = false) => {
    try {
      if (fresh) invalidateCache("/api/csp-hunter");
      const data = await cachedFetchJson<{ scans?: ScanRecord[] }>("/api/csp-hunter", {
        ttlMs: 5 * 60_000,
      });
      if (data.scans && data.scans.length > 0) setScan(data.scans[0]);
    } catch {
      /* cached data stays on screen */
    }
  }, []);

  const loadWeekly = useCallback(async () => {
    try {
      const data = await cachedFetchJson<{ picks: WeeklyPick[]; weekStart: string | null }>(
        "/api/csp-hunter/weekly-recap",
        { ttlMs: 10 * 60_000 }
      );
      setWeekly(data);
    } catch {
      /* leave whatever is on screen */
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  useEffect(() => {
    if (strategy === "wkly" && weekly === null) loadWeekly();
  }, [strategy, weekly, loadWeekly]);

  /* ---- scanning ------------------------------------------------------ */

  const busyRef = useRef(false);

  const runCspHunter = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const startedAt = Date.now();
    setBusy({ strategy, startedAt });
    setFailed(null);
    try {
      const res = await fetch("/api/csp-hunter", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      await loadScans(true);
      // One CSP Hunter run fills all three of its sections, so all three
      // segments have just been scanned, not only the one you are looking at.
      const durationMs = Date.now() - startedAt;
      setLastRun((prev) => ({ ...prev, csp: durationMs, calls: durationMs, leaps: durationMs }));
      haptic([12, 40, 12]);
    } catch {
      setFailed(strategy);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, [strategy, loadScans]);

  const runPmcc = useCallback(
    async (slug: SectorKey) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const startedAt = Date.now();
      setBusy({ strategy: "pmcc", startedAt });
      setFailed(null);
      try {
        const url = slug === "all" ? "/api/pmcc-scan" : `/api/pmcc-scan?sector=${slug}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { setups: PmccSetup[]; totalTickers: number };
        const durationMs = Date.now() - startedAt;
        setPmccBySector((prev) => ({
          ...prev,
          [slug]: { setups: data.setups ?? [], total: data.totalTickers ?? 0, at: Date.now(), durationMs },
        }));
        setLastRun((prev) => ({ ...prev, pmcc: durationMs }));
        haptic([12, 40, 12]);
      } catch {
        setFailed("pmcc");
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    []
  );

  const scanning = busy?.strategy === strategy;
  const telemetry = useScanTelemetry(SCAN_KIND[strategy], scanning, busy?.startedAt ?? null);

  /* ---- selection ----------------------------------------------------- */

  // Restoring scroll is what makes the switch a re-query rather than a
  // navigation: the answer changes, your place in the list does not.
  const pendingScroll = useRef<number | null>(null);

  const chooseStrategy = (next: Strategy) => {
    if (next === strategy) return;
    pendingScroll.current = window.scrollY;
    haptic(8);
    setExpanded(null);
    setStrategy(next);
  };

  const chooseSector = (next: SectorKey) => {
    haptic(8);
    setExpanded(null);
    setSector(next);
    if (strategy === "pmcc" && !pmccBySector[next]) runPmcc(next);
  };

  useLayoutEffect(() => {
    if (pendingScroll.current == null) return;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(pendingScroll.current, max));
    pendingScroll.current = null;
  });

  /* ---- results ------------------------------------------------------- */

  const capital = scan?.capital ?? null;

  const all = useMemo<Setup[]>(() => {
    switch (strategy) {
      case "csp":
        return (scan?.candidates ?? []).map(cspSetup);
      case "calls":
        return (scan?.callCandidates ?? []).map((c) => callSetup(c, "calls"));
      case "leaps":
        return (scan?.leapsCandidates ?? []).map((c) => callSetup(c, "leaps"));
      case "pmcc":
        return (pmccBySector[sector]?.setups ?? []).map(pmccSetup);
      case "wkly":
        return (weekly?.picks ?? []).map(weeklySetup);
    }
  }, [strategy, sector, scan, pmccBySector, weekly]);

  const capitalFilterable = all.some((s) => s.capitalRequired != null) && capital != null;

  const results = useMemo(() => {
    const bySector = all.filter((s) => inSector(s.symbol, sector));
    const byCapital =
      fitsOnly && capitalFilterable ? bySector.filter((s) => fitsCapital(s, capital)) : bySector;
    return rankSetups(byCapital);
  }, [all, sector, fitsOnly, capitalFilterable, capital]);

  const leader = results[0]?.metric ?? 0;
  const registerRef = useFlipList(results.map((s) => s.id));

  const state: ScanState = scanning
    ? "scanning"
    : failed === strategy
      ? "error"
      : lastRun[strategy] != null
        ? "done"
        : "idle";

  const dataAge =
    strategy === "pmcc"
      ? pmccBySector[sector]
        ? ago(pmccBySector[sector].at)
        : null
      : scan
        ? ago(new Date(scan.createdAt).getTime())
        : null;

  const onScan =
    strategy === "pmcc"
      ? () => runPmcc(sector)
      : strategy === "wkly"
        ? null
        : runCspHunter;

  // The live job's own total wins while a scan runs; the cached one only
  // labels a finished list.
  const shownTelemetry = scanning
    ? telemetry
    : {
        ...telemetry,
        total: strategy === "pmcc" ? pmccBySector[sector]?.total ?? null : telemetry.total,
      };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingBottom: 24 }}>
      {/* Header */}
      <div
        style={{
          padding: `12px ${GUTTER}px 14px`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
          Scanner
        </h1>
        {capital != null && (
          <span className="refresh-mono" style={{ fontSize: 11, color: "var(--text-dim)", flex: "none" }}>
            {fmtCompactMoney(capital)} SCAN CAPITAL
          </span>
        )}
      </div>

      <div style={{ padding: `0 ${GUTTER}px 14px` }}>
        <SegmentedSwitch
          segments={STRATEGIES}
          active={strategy}
          onChange={chooseStrategy}
          aria-label="Strategy"
        />
      </div>

      {strategy === "leaps" ? (
        <LeapsLab />
      ) : strategy === "pmcc" ? (
        <PmccIncome />
      ) : (
        <>
          <div style={{ paddingBottom: 16 }}>
            <ChipRow
              chips={SECTOR_CHIPS}
              active={sector}
              onChange={chooseSector}
              variant="outlined"
              gutter={GUTTER}
              aria-label="Sector"
            />
          </div>

          <div style={{ margin: `0 ${GUTTER}px 18px` }}>
            <ScanStatusBlock
              state={state}
              telemetry={shownTelemetry}
              setupCount={results.length}
              noun={strategy === "wkly" ? "PICKS" : "SETUPS"}
              lastDurationMs={lastRun[strategy] ?? null}
              dataAge={dataAge}
              onScan={onScan}
            />
          </div>

          <div
            style={{
              padding: `0 ${GUTTER}px 10px`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <h2 className="refresh-heading">{HEADINGS[strategy]}</h2>
            {capitalFilterable && (
              <button
                type="button"
                onClick={() => setFitsOnly((v) => !v)}
                className="refresh-mono"
                style={{
                  flex: "none",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: fitsOnly ? "var(--accent)" : "var(--text-dim)",
                  background: "none",
                  border: "none",
                  padding: "14px 0 14px 14px",
                  margin: "-14px 0",
                }}
                aria-pressed={fitsOnly}
              >
                {fitsOnly ? "FITS CAPITAL" : "ALL SETUPS"}
              </button>
            )}
          </div>

          <div style={{ padding: `0 ${GUTTER}px`, display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((setup, i) => (
              <SetupCard
                key={setup.id}
                setup={setup}
                rank={i + 1}
                index={i}
                fill={barFill(setup, leader)}
                expanded={expanded === setup.id}
                onToggle={() => setExpanded((prev) => (prev === setup.id ? null : setup.id))}
                registerRef={registerRef(setup.id)}
              />
            ))}

            {scanning && <SetupCardSkeleton />}

            {!scanning && results.length === 0 && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", padding: "6px 2px" }}>
                {all.length > 0
                  ? "Nothing in this sector at your capital. Try another sector, or turn the capital filter off."
                  : strategy === "wkly"
                    ? "No picks recorded this week yet."
                    : "No setups from the last scan. Run one from the block above."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
