"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// =========================================================================
// Types — mirrors GET /api/portfolio/time-machine response shape from spec
// =========================================================================

interface SnapshotPosition {
  symbol: string;
  units: number;
  costBasis: number;
  snapshotPrice: number;
}
interface SnapshotOption {
  ticker: string;
  underlying: string;
  type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  units: number;
}
interface SimStockValue {
  symbol: string;
  units: number;
  todayPrice: number;
  value: number;
}
type OptionStatus = "live" | "exercised" | "assigned" | "expired-otm";
interface SimOptionValue {
  ticker: string;
  status: OptionStatus;
  value: number;
  note?: string;
}
interface CashFlowItem { date: string; amount: number }
interface DividendItem { date: string; symbol: string; amount: number }

interface TimeMachineResult {
  snapshotDate: string;
  todayDate: string;
  earliestAvailable?: string;
  snapshot: {
    positions: SnapshotPosition[];
    options: SnapshotOption[];
    cash: number;
    total: number;
  };
  simulation: {
    stockValues: SimStockValue[];
    optionValues: SimOptionValue[];
    cashStart: number;
    deposits: CashFlowItem[];
    withdrawals: CashFlowItem[];
    dividends: DividendItem[];
    interest: CashFlowItem[];
    totalDepositsAdded: number;
    totalWithdrawalsFunded: number;
    total: number;
  };
  actual: {
    total: number;
    breakdown?: {
      stocks: number;
      options: number;
      cash: number;
      accountCount: number;
      stockPositionCount: number;
      optionPositionCount: number;
      perAccount?: Array<{
        id: string; name: string; institution: string; number: string;
        stocks: number; options: number; cash: number; total: number;
      }>;
    };
  };
  delta: { absolute: number; pct: number; favorableToHold: boolean };
  realizedGains?: {
    options: number;
    stocksShortTerm: number;
    stocksLongTerm: number;
    total: number;
    estimatedTax: number;
    taxBreakdown: {
      stcgRate: number;
      ltcgRate: number;
      stcgBase: number;
      ltcgBase: number;
      stcgTax: number;
      ltcgTax: number;
    };
    taxRateLabel: string;
  };
  rsuVests?: {
    items: Array<{ date: string; symbol: string; units: number; vestPrice: number; valueAtVest: number; source: "description" | "amzn-rule" }>;
    totalUnitsBySymbol: Record<string, number>;
    totalValueAtVest: number;
    monthsWithVests: string[];
  };
  assumptions: string[];
}

// =========================================================================
// Mock fixture — used until /api/portfolio/time-machine is wired up
// =========================================================================


// =========================================================================
// Formatters
// =========================================================================

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}
function fmtCurrency0(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "2-digit",
  });
}
function isoNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

const STATUS_STYLES: Record<OptionStatus, { bg: string; label: string }> = {
  "live":         { bg: "bg-sky-100 text-sky-700",         label: "Live" },
  "exercised":    { bg: "bg-emerald-100 text-emerald-700", label: "Exercised" },
  "assigned":     { bg: "bg-violet-100 text-violet-700",   label: "Assigned" },
  "expired-otm":  { bg: "bg-stone-100 text-stone-600",     label: "Expired OTM" },
};

// =========================================================================
// Page
// =========================================================================

export default function TimeMachinePage() {
  const [selectedDate, setSelectedDate] = useState<string>(isoNDaysAgo(180));
  const [data, setData] = useState<TimeMachineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  type SortCol = "symbol" | "units" | "snapshotPrice" | "todayPrice" | "snapshotValue" | "todayValue" | "returnPct" | "contribution";
  const DEFAULT_COL_ORDER: SortCol[] = ["symbol", "units", "snapshotPrice", "todayPrice", "snapshotValue", "todayValue", "returnPct", "contribution"];
  const COL_ORDER_KEY = "tm-col-order-v1";
  const [sortCol, setSortCol] = useState<SortCol>("todayValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [colOrder, setColOrder] = useState<SortCol[]>(DEFAULT_COL_ORDER);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Backfilled monthly snapshots — drives the colored month-button strip.
  type SnapshotMeta = { snapshotDate: string; deltaAbsolute: number; favorableToHold: boolean; computedAt: string };
  const [snapshotList, setSnapshotList] = useState<SnapshotMeta[]>([]);
  const [earliestAvailableMeta, setEarliestAvailableMeta] = useState<string | null>(null);
  const [showMoreMonths, setShowMoreMonths] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  // Privacy: hide exact dollar deltas on month buttons (for screenshot sharing).
  const [showDeltas, setShowDeltas] = useState(true);
  // Months currently being backfilled (auto-batch). Used for pulsing UI.
  const [inProgressMonths, setInProgressMonths] = useState<Set<string>>(new Set());
  const [autoBatchKickedOff, setAutoBatchKickedOff] = useState(false);

  // Helper: page-wide currency formatting that honors the privacy toggle.
  const $ = (n: number) => (showDeltas ? fmtCurrency(n) : "$•••");
  const $0 = (n: number) => (showDeltas ? fmtCurrency0(n) : "$•••");

  // Restore persisted column order on mount; persist on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(COL_ORDER_KEY);
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        const valid = arr.filter((k) => DEFAULT_COL_ORDER.includes(k as SortCol)) as SortCol[];
        if (valid.length === DEFAULT_COL_ORDER.length) setColOrder(valid);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(COL_ORDER_KEY, JSON.stringify(colOrder));
  }, [colOrder]);
  function resetColOrder() { setColOrder(DEFAULT_COL_ORDER); }

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir(col === "symbol" ? "asc" : "desc"); }
  }
  function handleColDrop(targetIdx: number) {
    if (dragIdx == null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    setColOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }

  // Earliest date the broker has activity for — populated from API response.
  const earliestAvailable = data?.earliestAvailable ?? "2020-01-01";

  // Fetch the list of cached monthly snapshots on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portfolio/time-machine/cached");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setSnapshotList(json.snapshots || []);
        if (json.earliestAvailable) setEarliestAvailableMeta(json.earliestAvailable);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Compute every month-end (last weekday) from `earliest` through last month.
  function computeExpectedMonthEnds(earliestISO: string): { date: string; monthKey: string }[] {
    const earliest = earliestISO.slice(0, 10);
    const today = new Date();
    // Start at last completed month
    let y = today.getUTCFullYear();
    let m = today.getUTCMonth() - 1;
    if (m < 0) { m = 11; y -= 1; }
    const out: { date: string; monthKey: string }[] = [];
    while (true) {
      const lastDay = new Date(Date.UTC(y, m + 1, 0));
      const dow = lastDay.getUTCDay();
      if (dow === 0) lastDay.setUTCDate(lastDay.getUTCDate() - 2);
      else if (dow === 6) lastDay.setUTCDate(lastDay.getUTCDate() - 1);
      const dateISO = lastDay.toISOString().slice(0, 10);
      if (dateISO < earliest) break;
      out.push({ date: dateISO, monthKey: `${y}-${String(m + 1).padStart(2, "0")}` });
      m -= 1;
      if (m < 0) { m = 11; y -= 1; }
      if (out.length > 240) break; // safety cap (20yr)
    }
    return out;
  }

  // Fire batched parallel backfills for `missingDates`. Each call gets up to
  // 3 dates; calls run concurrently. The route processes its batch in parallel
  // internally too — so 5 missing months becomes 2 concurrent HTTP calls × 3
  // parallel sims each, instead of 5 sequential sims that would time out.
  async function runBatchBackfills(missingDates: string[]) {
    if (!missingDates.length) return;
    const monthKeys = missingDates.map((d) => d.slice(0, 7));
    setInProgressMonths(new Set(monthKeys));
    const batches: string[][] = [];
    for (let i = 0; i < missingDates.length; i += 3) batches.push(missingDates.slice(i, i + 3));
    try {
      await Promise.all(
        batches.map((batch) =>
          fetch(`/api/portfolio/time-machine/backfill?targets=${batch.join(",")}`, { method: "POST" })
        )
      );
      // Refresh cached list
      const json = await fetch("/api/portfolio/time-machine/cached").then((r) => r.json()).catch(() => null);
      if (json?.snapshots) setSnapshotList(json.snapshots);
      setBackfillResult(`Backfilled ${missingDates.length} month${missingDates.length === 1 ? "" : "s"} in parallel`);
    } catch (e) {
      setBackfillResult(e instanceof Error ? e.message : "Batch backfill failed");
    } finally {
      setInProgressMonths(new Set());
    }
  }

  // Auto-detect & auto-fire batch backfill on first load when stuff is missing.
  // Bounded by what the broker actually has (earliestAvailable from API)
  // — historically up to 24 months for Fidelity-via-SnapTrade.
  useEffect(() => {
    if (autoBatchKickedOff || snapshotList.length === 0) return;
    const haveDates = new Set(snapshotList.map((s) => s.snapshotDate.slice(0, 7)));
    const earliest = earliestAvailableMeta ?? "2025-01-01";
    const expected = computeExpectedMonthEnds(earliest);
    const missing = expected
      .map((e) => ({ date: e.date, monthKey: e.monthKey }))
      .filter((e) => !haveDates.has(e.monthKey))
      .map((e) => e.date);
    if (missing.length > 0 && missing.length <= 30) {
      setAutoBatchKickedOff(true);
      runBatchBackfills(missing);
    } else {
      setAutoBatchKickedOff(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotList, earliestAvailableMeta, autoBatchKickedOff]);

  async function loadCached(date: string) {
    setSelectedDate(date);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/time-machine/cached?date=${date}`);
      if (!res.ok) throw new Error("Cached snapshot not available");
      const json = (await res.json()) as TimeMachineResult;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cached snapshot");
    } finally {
      setLoading(false);
    }
  }

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/portfolio/time-machine/backfill?from=2025-01-01", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Backfill failed");
      setBackfillResult(`Backfilled ${json.ok}/${json.targets} months (skipped ${json.skipped}, errors ${json.errors})`);
      // Refresh list
      const list = await fetch("/api/portfolio/time-machine/cached").then((r) => r.json()).catch(() => null);
      if (list?.snapshots) setSnapshotList(list.snapshots);
    } catch (e) {
      setBackfillResult(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  }

  async function runSimulation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/time-machine?date=${selectedDate}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Simulation failed (${res.status})`);
      }
      setData(json as TimeMachineResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <span>⏰</span> Hindsight
          </h1>
          <p className="text-sm text-stone-500">If you&apos;d stopped trading on…</p>
        </div>

        {/* Monthly snapshot strip — expected months, grey/pulse for missing */}
        {(snapshotList.length > 0 || inProgressMonths.size > 0) && (() => {
          // Merge expected months with cached snapshots into a single timeline.
          const earliestForStrip =
            data?.earliestAvailable ??
            earliestAvailableMeta ??
            (snapshotList.length > 0 ? snapshotList[snapshotList.length - 1].snapshotDate : "2025-01-01");
          const expectedRaw = computeExpectedMonthEnds(earliestForStrip);
          const byMonth = new Map(snapshotList.map((s) => [s.snapshotDate.slice(0, 7), s]));
          // Combined view: each entry is either a SnapshotMeta or a placeholder.
          type StripItem =
            | { kind: "data"; meta: SnapshotMeta; monthKey: string }
            | { kind: "missing"; date: string; monthKey: string; inProgress: boolean };
          const items: StripItem[] = expectedRaw.map((e) => {
            const meta = byMonth.get(e.monthKey);
            if (meta) return { kind: "data" as const, meta, monthKey: e.monthKey };
            return { kind: "missing" as const, date: e.date, monthKey: e.monthKey, inProgress: inProgressMonths.has(e.monthKey) };
          });
          const inline = items.slice(0, 6);
          const overflow = items.slice(6, 12);  // detail page handles older months
          const monthLabel = (iso: string) => {
            const [y, m] = iso.split("-");
            return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          };
          // Scale color intensity by |delta| relative to the biggest |delta|
          // in the visible set. Bigger magnitude → deeper color.
          const maxAbs = Math.max(...snapshotList.map((s) => Math.abs(s.deltaAbsolute)), 1);
          // Color semantics (flipped from prior version):
          //   GREEN = trading WORKED (actual > sim → favorableToHold=false)
          //   RED   = should have stopped (actual < sim → favorableToHold=true)
          const intensityClass = (s: SnapshotMeta) => {
            const tier = Math.abs(s.deltaAbsolute) / maxAbs;
            const isRed = s.favorableToHold;
            if (tier >= 0.75) return isRed
              ? "bg-rose-300 border-rose-400 text-rose-900 hover:bg-rose-400"
              : "bg-emerald-300 border-emerald-400 text-emerald-900 hover:bg-emerald-400";
            if (tier >= 0.5) return isRed
              ? "bg-rose-200 border-rose-300 text-rose-900 hover:bg-rose-300"
              : "bg-emerald-200 border-emerald-300 text-emerald-900 hover:bg-emerald-300";
            if (tier >= 0.25) return isRed
              ? "bg-rose-100 border-rose-200 text-rose-800 hover:bg-rose-200"
              : "bg-emerald-100 border-emerald-200 text-emerald-800 hover:bg-emerald-200";
            return isRed
              ? "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100";
          };
          const renderItem = (it: StripItem) => {
            if (it.kind === "missing") {
              const greyClass = it.inProgress
                ? "bg-stone-100 border-stone-300 text-stone-600 animate-pulse"
                : "bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100";
              return (
                <button
                  key={it.monthKey}
                  onClick={() => !it.inProgress && runBatchBackfills([it.date])}
                  disabled={it.inProgress}
                  className={`flex flex-col items-center justify-center px-2.5 rounded-lg border text-[10px] font-medium transition-colors shrink-0 h-10 min-w-[60px] ${greyClass}`}
                  title={it.inProgress ? "Backfilling…" : "Click to backfill this month"}
                >
                  <span className="font-bold leading-tight">{monthLabel(it.monthKey + "-01")}</span>
                  <span className="text-[9px] opacity-70 leading-tight">
                    {it.inProgress ? "…" : "no data"}
                  </span>
                </button>
              );
            }
            const s = it.meta;
            const sel = selectedDate === s.snapshotDate;
            const ring = sel ? "ring-2 ring-stone-900 ring-offset-1" : "";
            return (
              <button
                key={s.snapshotDate}
                onClick={() => loadCached(s.snapshotDate)}
                className={`flex flex-col items-center justify-center px-2.5 rounded-lg border text-[10px] font-medium transition-colors shrink-0 h-10 min-w-[60px] ${intensityClass(s)} ${ring}`}
                title={showDeltas
                  ? `${s.snapshotDate} · delta ${s.deltaAbsolute >= 0 ? "+" : ""}${fmtCurrency0(s.deltaAbsolute)}`
                  : `${s.snapshotDate}`}
              >
                <span className="font-bold leading-tight">{monthLabel(s.snapshotDate)}</span>
                {showDeltas && (
                  <span className="text-[9px] opacity-70 leading-tight">
                    {s.deltaAbsolute >= 0 ? "+" : ""}{fmtCurrency0(s.deltaAbsolute)}
                  </span>
                )}
              </button>
            );
          };
          return (
            <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                  Monthly snapshots · click to load
                </span>
                <div className="flex items-center gap-3">
                  {/* iOS-style toggle for delta visibility (screenshot-safe mode) */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-[10px] text-stone-500">$</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showDeltas}
                      onClick={() => setShowDeltas((v) => !v)}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showDeltas ? "bg-emerald-500" : "bg-stone-300"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${showDeltas ? "translate-x-3.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </label>
                  <button
                    type="button"
                    onClick={runBackfill}
                    disabled={backfilling}
                    className="text-[10px] text-stone-400 hover:text-stone-600 transition disabled:opacity-50"
                    title="Regenerate every monthly snapshot"
                  >
                    {backfilling ? "Backfilling…" : "↻ Backfill"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inline.map(renderItem)}
                {showMoreMonths && overflow.map(renderItem)}
                {overflow.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMoreMonths((v) => !v)}
                    className="px-2.5 rounded-lg border border-stone-200 bg-stone-50 text-[10px] font-semibold text-stone-600 hover:bg-stone-100 transition shrink-0 h-10"
                  >
                    {showMoreMonths ? "▴ Less" : `▾ +${overflow.length}`}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 text-[9px] text-stone-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> trading worked
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> should&apos;ve stopped
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-stone-300" /> not yet computed
                </span>
              </div>

              {/* Center-aligned full-detail CTA, theme-aligned with portfolio buttons */}
              <Link
                href="/time-machine/detail"
                className="mt-1 inline-flex items-center justify-center self-center gap-1.5 px-4 py-2 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 hover:bg-violet-100 active:bg-violet-200 text-xs font-semibold transition-colors"
              >
                <span>⏰</span> Full Hindsight Snapshot
              </Link>

              {backfillResult && (
                <p className="text-[10px] text-stone-500 italic">{backfillResult}</p>
              )}
            </div>
          );
        })()}

        {/* Empty state — prompt to run first backfill */}
        {snapshotList.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-stone-500">No monthly snapshots yet</span>
            <button
              type="button"
              onClick={runBackfill}
              disabled={backfilling}
              className="px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-900 disabled:opacity-50 transition"
            >
              {backfilling ? "Backfilling…" : "Backfill 2025+"}
            </button>
          </div>
        )}

        {/* Date picker row */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-stone-400 uppercase tracking-wider">Snapshot date</label>
              <input
                type="date"
                value={selectedDate}
                min={earliestAvailable}
                max={isoNDaysAgo(7)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Simulating…" : "Simulate"}
            </button>
          </div>
          <p className="text-[10px] text-stone-400">
            History available back to {fmtDate(earliestAvailable)}
          </p>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error} — showing sample data
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {data && !loading && (
          <>
            {/* HeroDelta card */}
            <div
              className={`rounded-xl border p-5 ${
                data.delta.favorableToHold
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                If you&apos;d stopped trading on {fmtDate(data.snapshotDate)}
              </p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  data.delta.favorableToHold ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                You&apos;d have {fmtCurrency0(Math.abs(data.delta.absolute))}{" "}
                {data.delta.favorableToHold ? "more" : "less"}
              </p>
              <p
                className={`text-sm font-semibold mt-1 ${
                  data.delta.favorableToHold ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {data.delta.favorableToHold ? "+" : ""}
                {data.delta.pct.toFixed(2)}% vs actual
              </p>
            </div>

            {/* Snapshot summary card */}
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Snapshot</p>
              <p className="text-sm text-stone-700 mt-1">
                On <span className="font-semibold text-stone-900">{fmtDate(data.snapshotDate)}</span>:
                held <span className="font-semibold text-stone-900">{data.snapshot.positions.length}</span> stocks,{" "}
                <span className="font-semibold text-stone-900">{data.snapshot.options.length}</span> options,{" "}
                <span className="font-semibold text-stone-900">{fmtCurrency0(data.snapshot.cash)}</span> cash,
                total <span className="font-semibold text-stone-900">{fmtCurrency0(data.snapshot.total)}</span>
              </p>
            </div>

            {/* Today comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">Actual today</p>
                  {data.actual.breakdown && (
                    <button
                      type="button"
                      onClick={() => setBreakdownOpen((v) => !v)}
                      className="text-[10px] text-stone-400 hover:text-stone-600 transition"
                    >
                      {breakdownOpen ? "hide" : "details"}
                    </button>
                  )}
                </div>
                <p className="text-xl font-bold text-stone-900 mt-1">{fmtCurrency0(data.actual.total)}</p>
                {breakdownOpen && data.actual.breakdown && (
                  <div className="mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-500 space-y-0.5 tabular-nums">
                    <div className="flex justify-between"><span>Stocks ({data.actual.breakdown.stockPositionCount})</span><span>{fmtCurrency0(data.actual.breakdown.stocks)}</span></div>
                    <div className="flex justify-between"><span>Options ({data.actual.breakdown.optionPositionCount}, net of shorts)</span><span>{fmtCurrency0(data.actual.breakdown.options)}</span></div>
                    <div className="flex justify-between"><span>Cash</span><span>{fmtCurrency0(data.actual.breakdown.cash)}</span></div>
                    <div className="pt-1.5 mt-1.5 border-t border-stone-100">
                      <div className="text-stone-400 mb-1">
                        {data.actual.breakdown.accountCount} account{data.actual.breakdown.accountCount === 1 ? "" : "s"} linked via SnapTrade
                      </div>
                      {data.actual.breakdown.perAccount && data.actual.breakdown.perAccount.map((a) => (
                        <div key={a.id} className="flex justify-between py-0.5 border-t border-stone-50">
                          <span className="truncate pr-2 text-stone-600">
                            {a.institution} · {a.name}
                            {a.number ? ` (${a.number.slice(-4)})` : ""}
                          </span>
                          <span className="text-stone-700 font-medium">{fmtCurrency0(a.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Simulated today</p>
                <p className="text-xl font-bold text-stone-900 mt-1">{fmtCurrency0(data.simulation.total)}</p>
              </div>
            </div>

            {/* Holdings table — sortable, includes CASH */}
            {(() => {
              // Build sorted rows: stocks + a synthetic CASH row.
              const snapPriceBySym = new Map(data.snapshot.positions.map((p) => [p.symbol, p.snapshotPrice]));
              const stockRows = data.simulation.stockValues.map((s) => {
                const snapPrice = snapPriceBySym.get(s.symbol) ?? 0;
                const snapValue = snapPrice * s.units;
                return {
                  symbol: s.symbol,
                  units: s.units,
                  snapshotPrice: snapPrice,
                  todayPrice: s.todayPrice,
                  snapshotValue: snapValue,
                  todayValue: s.value,
                  returnPct: snapPrice > 0 ? ((s.todayPrice - snapPrice) / snapPrice) * 100 : null,
                  isCash: false,
                };
              });
              const sumStockToday = stockRows.reduce((a, r) => a + r.todayValue, 0);
              const sumOptionToday = data.simulation.optionValues.reduce((a, o) => a + o.value, 0);
              const cashToday = data.simulation.total - sumStockToday - sumOptionToday;
              const cashSnap = data.snapshot.cash;
              const cashRow = {
                symbol: "CASH",
                units: 1,
                snapshotPrice: 1,
                todayPrice: 1,
                snapshotValue: cashSnap,
                todayValue: cashToday,
                // Cash never "appreciates" — any delta between snap and today
                // comes from added cash (deposits/dividends/interest), not
                // price growth. Always report 0% to avoid implying yield.
                returnPct: 0,
                isCash: true,
              };
              const allRows = [...stockRows, cashRow];
              const cmp = (a: typeof allRows[number], b: typeof allRows[number]): number => {
                let v = 0;
                switch (sortCol) {
                  case "symbol":        v = a.symbol.localeCompare(b.symbol); break;
                  case "units":         v = a.units - b.units; break;
                  case "snapshotPrice": v = a.snapshotPrice - b.snapshotPrice; break;
                  case "todayPrice":    v = a.todayPrice - b.todayPrice; break;
                  case "snapshotValue": v = a.snapshotValue - b.snapshotValue; break;
                  case "todayValue":    v = a.todayValue - b.todayValue; break;
                  case "returnPct":     v = (a.returnPct ?? -Infinity) - (b.returnPct ?? -Infinity); break;
                  case "contribution":  v = a.todayValue - b.todayValue; break;
                }
                return sortDir === "asc" ? v : -v;
              };
              const sorted = [...allRows].sort(cmp);
              const totalToday = data.simulation.total;

              const arrow = (col: SortCol) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

              // Column definitions — single source of truth for label, alignment,
              // and how to render the header / body / footer cell for each column.
              type RowT = typeof allRows[number];
              const COL_DEFS: Record<SortCol, {
                label: string;
                align: "left" | "right";
                body: (r: RowT) => React.ReactNode;
                bodyClass?: (r: RowT) => string;
                foot?: React.ReactNode;
              }> = {
                symbol: { label: "Symbol", align: "left",
                  body: (r) => r.symbol,
                  bodyClass: () => "font-semibold text-stone-900",
                  foot: <span className="font-bold text-stone-900">Total</span>,
                },
                units: { label: "Units", align: "right",
                  body: (r) => r.isCash ? "—" : Math.round(r.units),
                  bodyClass: () => "text-stone-700 tabular-nums",
                },
                snapshotPrice: { label: "Snap $", align: "right",
                  body: (r) => r.isCash ? "—" : (r.snapshotPrice > 0 ? fmtCurrency(r.snapshotPrice) : "—"),
                  bodyClass: () => "text-stone-500 tabular-nums",
                },
                todayPrice: { label: "Today $", align: "right",
                  body: (r) => r.isCash ? "—" : fmtCurrency(r.todayPrice),
                  bodyClass: () => "text-stone-700 tabular-nums",
                },
                snapshotValue: { label: "Snap value", align: "right",
                  body: (r) => fmtCurrency0(r.snapshotValue),
                  bodyClass: () => "text-stone-500 tabular-nums",
                  foot: <span className="font-bold text-stone-700 tabular-nums">{fmtCurrency0(data.snapshot.total)}</span>,
                },
                todayValue: { label: "Today value", align: "right",
                  body: (r) => fmtCurrency0(r.todayValue),
                  bodyClass: () => "font-medium text-stone-900 tabular-nums",
                  foot: <span className="font-bold text-stone-900 tabular-nums">{fmtCurrency0(totalToday)}</span>,
                },
                returnPct: { label: "Return", align: "right",
                  body: (r) => r.returnPct == null ? "—" : `${r.returnPct >= 0 ? "+" : ""}${r.returnPct.toFixed(1)}%`,
                  bodyClass: (r) => `font-medium tabular-nums ${r.returnPct == null ? "text-stone-400" : r.returnPct >= 0 ? "text-emerald-600" : "text-red-500"}`,
                  foot: data.snapshot.total > 0 ? (
                    <span className="font-bold tabular-nums">
                      {`${((totalToday - data.snapshot.total) / data.snapshot.total * 100).toFixed(1)}%`}
                    </span>
                  ) : "—",
                },
                contribution: { label: "% of total", align: "right",
                  body: (r) => `${(totalToday > 0 ? (r.todayValue / totalToday) * 100 : 0).toFixed(1)}%`,
                  bodyClass: () => "text-stone-500 tabular-nums",
                },
              };

              return (
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                      Holdings · drag column headers to reorder
                    </span>
                    <button
                      type="button"
                      onClick={resetColOrder}
                      className="text-[10px] text-stone-400 hover:text-stone-600 transition"
                      title="Reset column order"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-stone-400 border-y border-stone-100">
                          {colOrder.map((col, idx) => {
                            const def = COL_DEFS[col];
                            const isOver = dragOverIdx === idx && dragIdx !== idx;
                            return (
                              <th
                                key={col}
                                draggable
                                onDragStart={() => setDragIdx(idx)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                onDragLeave={() => setDragOverIdx((cur) => (cur === idx ? null : cur))}
                                onDrop={(e) => { e.preventDefault(); handleColDrop(idx); }}
                                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                                className={`px-2 py-1.5 font-medium select-none cursor-move ${isOver ? "bg-sky-50" : ""} ${dragIdx === idx ? "opacity-50" : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSort(col)}
                                  className={`w-full ${def.align === "right" ? "text-right" : "text-left"} font-medium hover:text-stone-700 transition flex items-center ${def.align === "right" ? "justify-end" : "justify-start"} gap-1`}
                                >
                                  <span className="text-stone-300 text-[9px]" aria-hidden>⋮⋮</span>
                                  <span>{def.label}{arrow(col)}</span>
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => (
                          <tr key={r.symbol} className={`border-t border-stone-50 ${r.isCash ? "bg-amber-50/30" : ""}`}>
                            {colOrder.map((col) => {
                              const def = COL_DEFS[col];
                              return (
                                <td
                                  key={col}
                                  className={`px-2 py-2 ${def.align === "right" ? "text-right" : ""} ${def.bodyClass?.(r) ?? ""}`}
                                >
                                  {def.body(r)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-stone-200 bg-stone-50">
                          {colOrder.map((col) => {
                            const def = COL_DEFS[col];
                            return (
                              <td key={col} className={`px-2 py-2 ${def.align === "right" ? "text-right" : ""}`}>
                                {def.foot ?? null}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Stale-data nudge — cached snapshot pre-dates RSU detection */}
            {!data.rsuVests && (
              <div className="rounded-xl border border-amber-300 bg-amber-100/60 px-3 py-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-amber-900">
                  This cached snapshot was computed before RSU detection landed. AMZN vests are missing from it.
                </p>
                <button
                  type="button"
                  onClick={runBackfill}
                  disabled={backfilling}
                  className="text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-800 px-2 py-1 rounded shrink-0 disabled:opacity-50"
                >
                  {backfilling ? "Backfilling…" : "↻ Regenerate"}
                </button>
              </div>
            )}

            {/* Inflows since snapshot — unified cash deposits + RSU vests */}
            {(() => {
              const hasCash = data.simulation.deposits.length > 0;
              const hasRsu = !!data.rsuVests && data.rsuVests.items.length > 0;
              if (!hasCash && !hasRsu) {
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                      New deposits added since {fmtDate(data.snapshotDate)}
                    </p>
                    <p className="text-xs text-amber-700/60 mt-2">No inflows in this window.</p>
                  </div>
                );
              }
              const totalInflows =
                data.simulation.totalDepositsAdded +
                (data.rsuVests?.totalValueAtVest ?? 0);
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                      New deposits added since {fmtDate(data.snapshotDate)}
                    </p>
                    <p className="text-[10px] text-amber-700/70">kept in sim</p>
                  </div>

                  {/* Cash deposits */}
                  {hasCash && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
                        Cash deposits · +{fmtCurrency(data.simulation.totalDepositsAdded)}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {data.simulation.deposits.map((d, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-amber-900/80">{fmtDateShort(d.date)}</span>
                            <span className="font-medium text-amber-800">+{fmtCurrency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RSU vests */}
                  {hasRsu && data.rsuVests && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
                        RSU vests · +{fmtCurrency(data.rsuVests.totalValueAtVest)}
                      </p>
                      <p className="text-[10px] text-amber-900/70 mb-1.5">
                        Vests in {data.rsuVests.monthsWithVests.length} month
                        {data.rsuVests.monthsWithVests.length === 1 ? "" : "s"}:
                        {" "}
                        <span className="font-semibold">
                          {data.rsuVests.monthsWithVests
                            .map((m) => {
                              const [y, mo] = m.split("-");
                              return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                            })
                            .join(" · ")}
                        </span>
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {data.rsuVests.items.map((v, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-amber-900/80">
                              {fmtDateShort(v.date)} · {v.symbol} × {Math.round(v.units)}
                            </span>
                            <span className="font-medium text-amber-800">+{fmtCurrency(v.valueAtVest)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-800/60 mt-1.5 italic">
                        Vested shares accrue without cash debit (income event).
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-xs pt-2 mt-3 border-t border-amber-200">
                    <span className="font-semibold text-amber-900">Total added</span>
                    <span className="font-bold text-amber-900">+{fmtCurrency(totalInflows)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Withdrawals — warm orange */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">
                  Would need to fund elsewhere
                </p>
                <p className="text-[10px] text-orange-700/70">not subtracted</p>
              </div>
              {data.simulation.withdrawals.length === 0 ? (
                <p className="text-xs text-orange-700/60 mt-2">No withdrawals in this window.</p>
              ) : (
                <div className="flex flex-col gap-0.5 mt-2">
                  {data.simulation.withdrawals.map((w, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-orange-900/80">{fmtDateShort(w.date)}</span>
                      <span className="font-medium text-orange-800">−{fmtCurrency(w.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pt-2 mt-1 border-t border-orange-200">
                    <span className="font-semibold text-orange-900">Total to fund</span>
                    <span className="font-bold text-orange-900">−{fmtCurrency(data.simulation.totalWithdrawalsFunded)}</span>
                  </div>
                  <p className="text-[10px] text-orange-700/70 mt-2 italic">
                    Note: not subtracted from simulation.
                  </p>
                </div>
              )}
            </div>

            {/* Realized gains + tax context (WA-specific) */}
            {data.realizedGains && data.realizedGains.total !== 0 && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-violet-700 font-semibold">
                    Why you may have withdrawn cash
                  </span>
                </div>
                <p className="text-xs text-violet-900 mb-3 leading-snug">
                  Your <em>actual</em> trading since {fmtDate(data.snapshotDate)} generated realized gains that
                  trigger a tax bill. In the sim you didn&apos;t trade, so no tax — meaning some portion of the
                  withdrawals above were likely real obligations.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">Options (STCG)</div>
                    <div className="text-sm font-bold text-stone-900">{fmtCurrency0(data.realizedGains.options)}</div>
                    <div className="text-[10px] text-stone-500 mt-1">All short-term</div>
                  </div>
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">Stocks STCG</div>
                    <div className="text-sm font-bold text-stone-900">{fmtCurrency0(data.realizedGains.stocksShortTerm)}</div>
                    <div className="text-[10px] text-stone-500 mt-1">Held &lt; 1 yr</div>
                  </div>
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">Stocks LTCG</div>
                    <div className="text-sm font-bold text-stone-900">{fmtCurrency0(data.realizedGains.stocksLongTerm)}</div>
                    <div className="text-[10px] text-stone-500 mt-1">Held ≥ 1 yr</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">STCG tax @ 40.8%</div>
                    <div className="text-sm font-bold text-rose-600">
                      ~{fmtCurrency0(data.realizedGains.taxBreakdown.stcgTax)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      on {fmtCurrency0(data.realizedGains.taxBreakdown.stcgBase)}
                    </div>
                  </div>
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">LTCG tax @ 30.8%</div>
                    <div className="text-sm font-bold text-rose-600">
                      ~{fmtCurrency0(data.realizedGains.taxBreakdown.ltcgTax)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      on {fmtCurrency0(data.realizedGains.taxBreakdown.ltcgBase)}
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-violet-200 rounded-lg p-2.5 mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-violet-700 font-semibold uppercase tracking-wider">Total est. tax</span>
                  <span className="text-base font-bold text-rose-600">~{fmtCurrency0(data.realizedGains.estimatedTax)}</span>
                </div>
                <p className="text-[10px] text-violet-700/80 mt-3 italic leading-snug">
                  {data.realizedGains.taxRateLabel}. Stock hold-period uses earliest in-window
                  BUY date; SELLs without an in-window BUY are skipped (incomplete history).
                </p>
              </div>
            )}

            {/* Options replay timeline */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                  Options replay
                </span>
              </div>
              {data.simulation.optionValues.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">No options held at snapshot</p>
              ) : (
                <div className="flex flex-col">
                  {data.simulation.optionValues.map((opt, i) => {
                    const snap = data.snapshot.options.find((o) => o.ticker === opt.ticker);
                    const style = STATUS_STYLES[opt.status];
                    return (
                      <div key={opt.ticker} className={`px-4 py-3 ${i > 0 ? "border-t border-stone-50" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.bg}`}>
                              {style.label}
                            </span>
                            <span className="text-xs font-medium text-stone-900 truncate">
                              {snap ? (
                                <>
                                  {snap.underlying} · {snap.type} ${snap.strike} ·{" "}
                                  <span className="text-stone-500">exp {fmtDateShort(snap.expiry)}</span>
                                </>
                              ) : opt.ticker}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold whitespace-nowrap ${
                            opt.value > 0 ? "text-emerald-600" : opt.value < 0 ? "text-rose-600" : "text-stone-500"
                          }`}>
                            {opt.value > 0 ? "+" : ""}{fmtCurrency(opt.value)}
                          </span>
                        </div>
                        {opt.note && (
                          <p className="text-[10px] text-stone-500 mt-1 ml-1">{opt.note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assumptions footer — collapsible */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setAssumptionsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                  Assumptions
                </span>
                <span className="text-stone-300 text-xs">{assumptionsOpen ? "▲" : "▼"}</span>
              </button>
              {assumptionsOpen && (
                <ul className="px-4 pb-4 pt-1 border-t border-stone-50 flex flex-col gap-1.5">
                  {data.assumptions.map((a, i) => (
                    <li key={i} className="text-[11px] text-stone-600 flex gap-2">
                      <span className="text-stone-300">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
