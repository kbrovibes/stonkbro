"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────
// Types — minimal slice of TimeMachineResult we actually consume here.
// ─────────────────────────────────────────────────────────────────────────

interface TimeMachinePayload {
  snapshotDate: string;
  snapshot: { total: number };
  simulation: {
    total: number;
    totalDepositsAdded: number;
    totalWithdrawalsFunded: number;
  };
  actual: { total: number };
  delta: { absolute: number; pct: number; favorableToHold: boolean };
  realizedGains?: {
    options: number;
    stocksShortTerm: number;
    stocksLongTerm: number;
    total: number;
    estimatedTax: number;
  };
  rsuVests?: {
    totalValueAtVest: number;
  };
}

interface CachedSnapshot {
  snapshotDate: string;
  deltaAbsolute: number;
  favorableToHold: boolean;
  computedAt: string;
  payload: TimeMachinePayload;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const mantissa = v / base;
  let rounded: number;
  if (mantissa <= 1) rounded = 1;
  else if (mantissa <= 2) rounded = 2;
  else if (mantissa <= 2.5) rounded = 2.5;
  else if (mantissa <= 5) rounded = 5;
  else rounded = 10;
  return rounded * base;
}

function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtComputed(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

type SortCol =
  | "snapshotDate"
  | "snapshotTotal"
  | "simTotal"
  | "actualTotal"
  | "deltaAbsolute"
  | "favorability"
  | "realizedGains"
  | "estimatedTax"
  | "rsuVests"
  | "deposits"
  | "withdrawals"
  | "computedAt";

export default function TimeMachineDetailPage() {
  const [snapshots, setSnapshots] = useState<CachedSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDollars, setShowDollars] = useState(true);
  const [sortCol, setSortCol] = useState<SortCol>("snapshotDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fmt = (n: number) =>
    showDollars
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(n)
      : "$•••";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/portfolio/time-machine/cached?expand=full");
        if (!res.ok) throw new Error(`Failed to load snapshots (${res.status})`);
        const json = await res.json();
        if (!cancelled) {
          setSnapshots((json.snapshots || []) as CachedSnapshot[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // API returns newest-first; charts want oldest-first.
  const chronological = useMemo(
    () => [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate)),
    [snapshots]
  );

  // Per-period deltas: each snapshot tracks gains/deposits between snapshotDate
  // and TODAY. Older snapshot's window includes period_i, so period_i delta =
  // prev − cur (clamped at 0 to avoid negative noise).
  type Row = {
    snapshot: CachedSnapshot;
    realizedGainsDelta: number; estimatedTaxDelta: number;
    cashDepositsDelta: number; rsuVestsDelta: number;
  };
  const rows: Row[] = useMemo(() => chronological.map((s, i) => {
    const prev = chronological[i - 1];
    const cur = s.payload;
    if (!prev) return { snapshot: s, realizedGainsDelta: 0, estimatedTaxDelta: 0, cashDepositsDelta: 0, rsuVestsDelta: 0 };
    const p = prev.payload;
    return {
      snapshot: s,
      realizedGainsDelta: Math.max(0, (p.realizedGains?.total ?? 0) - (cur.realizedGains?.total ?? 0)),
      estimatedTaxDelta:  Math.max(0, (p.realizedGains?.estimatedTax ?? 0) - (cur.realizedGains?.estimatedTax ?? 0)),
      cashDepositsDelta:  Math.max(0, (p.simulation.totalDepositsAdded ?? 0) - (cur.simulation.totalDepositsAdded ?? 0)),
      rsuVestsDelta:      Math.max(0, (p.rsuVests?.totalValueAtVest ?? 0) - (cur.rsuVests?.totalValueAtVest ?? 0)),
    };
  }), [chronological]);

  // ── Stats (lifetime = earliest snapshot, longest window) ─────────────
  const lifetimeStats = useMemo(() => {
    if (chronological.length === 0) {
      return { realized: 0, tax: 0, net: 0, bestStop: null as null | CachedSnapshot };
    }
    const earliest = chronological[0];
    const realized = earliest.payload.realizedGains?.total ?? 0;
    const tax = earliest.payload.realizedGains?.estimatedTax ?? 0;
    const net = realized - tax;
    // Best stop date = snapshot where freezing would have helped MOST
    // (favorableToHold && largest |deltaAbsolute|).
    let bestStop: CachedSnapshot | null = null;
    let bestMag = 0;
    for (const s of snapshots) {
      if (!s.favorableToHold) continue;
      const mag = Math.abs(s.deltaAbsolute);
      if (mag > bestMag) { bestMag = mag; bestStop = s; }
    }
    return { realized, tax, net, bestStop };
  }, [chronological, snapshots]);

  // ── Sorted table rows ────────────────────────────────────────────────
  const sortedTableRows = useMemo(() => {
    // Reuse the chronological-derived rows so deltas line up with snapshots.
    const enriched = rows.map((r) => {
      const p = r.snapshot.payload;
      return {
        row: r,
        snapshotDate: r.snapshot.snapshotDate,
        snapshotTotal: p.snapshot.total,
        simTotal: p.simulation.total,
        actualTotal: p.actual.total,
        deltaAbsolute: p.delta.absolute,
        favorability: r.snapshot.favorableToHold ? 1 : 0,
        realizedGains: r.realizedGainsDelta,
        estimatedTax: r.estimatedTaxDelta,
        rsuVests: r.rsuVestsDelta,
        deposits: r.cashDepositsDelta,
        withdrawals: p.simulation.totalWithdrawalsFunded ?? 0,
        computedAt: r.snapshot.computedAt,
      };
    });
    const cmp = (a: typeof enriched[number], b: typeof enriched[number]): number => {
      let v = 0;
      switch (sortCol) {
        case "snapshotDate": v = a.snapshotDate.localeCompare(b.snapshotDate); break;
        case "snapshotTotal": v = a.snapshotTotal - b.snapshotTotal; break;
        case "simTotal": v = a.simTotal - b.simTotal; break;
        case "actualTotal": v = a.actualTotal - b.actualTotal; break;
        case "deltaAbsolute": v = a.deltaAbsolute - b.deltaAbsolute; break;
        case "favorability": v = a.favorability - b.favorability; break;
        case "realizedGains": v = a.realizedGains - b.realizedGains; break;
        case "estimatedTax": v = a.estimatedTax - b.estimatedTax; break;
        case "rsuVests": v = a.rsuVests - b.rsuVests; break;
        case "deposits": v = a.deposits - b.deposits; break;
        case "withdrawals": v = a.withdrawals - b.withdrawals; break;
        case "computedAt": v = a.computedAt.localeCompare(b.computedAt); break;
      }
      return sortDir === "asc" ? v : -v;
    };
    return [...enriched].sort(cmp);
  }, [rows, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir(col === "snapshotDate" ? "desc" : "desc"); }
  }
  const arrow = (col: SortCol) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-4">

        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2"><span>⏰</span> Time Machine · All Snapshots & Insights</h1>
            <p className="text-sm text-stone-500">Trade-by-trade trajectory of trading vs. holding</p>
            <Link href="/time-machine" className="text-[11px] text-sky-600 hover:text-sky-800 mt-1 underline underline-offset-2">← Back to Time Machine</Link>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <span className="text-[10px] text-stone-500">$</span>
            <button type="button" role="switch" aria-checked={showDollars} onClick={() => setShowDollars((v) => !v)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showDollars ? "bg-sky-500" : "bg-stone-300"}`}>
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${showDollars ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </button>
          </label>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        )}
        {!loading && !error && snapshots.length === 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">No snapshots yet — head back and run a backfill.</div>
        )}

        {!loading && snapshots.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Lifetime realized gains" value={fmt(lifetimeStats.realized)} tone="stone"
                hint={chronological.length > 0 ? `since ${fmtDate(chronological[0].snapshotDate)}` : undefined} />
              <StatCard label="Total estimated tax" value={fmt(lifetimeStats.tax)} tone="rose" />
              <StatCard label="Net trading benefit" value={fmt(lifetimeStats.net)}
                tone={lifetimeStats.net >= 0 ? "emerald" : "rose"} />
              <StatCard label="Best stop date" tone="rose"
                value={lifetimeStats.bestStop
                  ? `${monthLabel(lifetimeStats.bestStop.snapshotDate)} · ${showDollars ? "+" + fmt(Math.abs(lifetimeStats.bestStop.deltaAbsolute)) : "+$•••"}`
                  : "—"} />
            </div>

            <ChartCard title="Simulated vs. actual portfolio over time" subtitle="If you'd frozen on each date">
              <LineChart rows={chronological} showDollars={showDollars} fmt={fmt} />
              <Legend items={[
                { color: "bg-sky-500", label: "Simulated (if frozen)" },
                { color: "bg-stone-700", label: "Actual (you kept trading)" },
              ]} />
            </ChartCard>

            <ChartCard title="Monthly delta — would-be benefit of stopping" subtitle="Green = trading worked · Red = should've stopped">
              <DeltaBars rows={chronological} showDollars={showDollars} fmt={fmt} />
            </ChartCard>

            <ChartCard title="Cumulative realized gains vs. tax drag" subtitle="Each snapshot's realized total vs. estimated tax">
              <CumulativeLineChart rows={chronological} showDollars={showDollars} fmt={fmt} />
              <Legend items={[
                { color: "bg-emerald-500", label: "Realized gains" },
                { color: "bg-rose-500", label: "Estimated tax" },
              ]} />
            </ChartCard>

            <ChartCard title="Inflows per period — cash + RSU vests" subtitle="Per-snapshot incremental deposits + vesting">
              <InflowBars rows={rows} showDollars={showDollars} fmt={fmt} />
              <Legend items={[
                { color: "bg-amber-500", label: "Cash deposits" },
                { color: "bg-teal-500", label: "RSU vests" },
              ]} />
            </ChartCard>

            {/* Full data table */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                  All snapshots · click row to load on main page
                </span>
                <span className="text-[10px] text-stone-400">
                  {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-stone-400 border-y border-stone-100">
                      {([
                        ["Month", "snapshotDate", "left"],
                        ["Snap total", "snapshotTotal", "right"],
                        ["Sim today", "simTotal", "right"],
                        ["Actual today", "actualTotal", "right"],
                        ["Δ vs actual", "deltaAbsolute", "right"],
                        ["Favor", "favorability", "center"],
                        ["Realized", "realizedGains", "right"],
                        ["Est. tax", "estimatedTax", "right"],
                        ["RSU", "rsuVests", "right"],
                        ["Deposits", "deposits", "right"],
                        ["Withdr.", "withdrawals", "right"],
                        ["Computed", "computedAt", "right"],
                      ] as [string, SortCol, "left" | "right" | "center"][]).map(([label, col, align]) => (
                        <Th key={col} label={label} col={col} sortCol={sortCol} arrow={arrow} toggle={toggleSort} align={align} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTableRows.map((r) => {
                      const isRed = r.favorability === 1;
                      const cell = "px-2 py-2 text-right tabular-nums";
                      const sign = showDollars && r.deltaAbsolute >= 0 ? "+" : "";
                      return (
                        <tr key={r.snapshotDate} className="border-t border-stone-50 hover:bg-stone-50/60 transition">
                          <td className="px-2 py-2">
                            <Link href={`/time-machine?date=${r.snapshotDate}`} className="font-semibold text-stone-900 hover:text-sky-700 transition">
                              {monthLabel(r.snapshotDate)}
                            </Link>
                          </td>
                          <td className={`${cell} text-stone-700`}>{fmt(r.snapshotTotal)}</td>
                          <td className={`${cell} text-stone-700`}>{fmt(r.simTotal)}</td>
                          <td className={`${cell} text-stone-700`}>{fmt(r.actualTotal)}</td>
                          <td className={`${cell} font-medium ${isRed ? "text-rose-600" : "text-emerald-600"}`}>{sign}{fmt(r.deltaAbsolute)}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded ${isRed ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {isRed ? "Should've stopped" : "Trading worked"}
                            </span>
                          </td>
                          <td className={`${cell} text-emerald-700`}>{fmt(r.realizedGains)}</td>
                          <td className={`${cell} text-rose-600`}>{fmt(r.estimatedTax)}</td>
                          <td className={`${cell} text-teal-700`}>{fmt(r.rsuVests)}</td>
                          <td className={`${cell} text-amber-700`}>{fmt(r.deposits)}</td>
                          <td className={`${cell} text-orange-700`}>{fmt(r.withdrawals)}</td>
                          <td className="px-2 py-2 text-right text-stone-400 text-[10px]">{fmtComputed(r.computedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, tone, hint }: { label: string; value: string; tone: "stone" | "emerald" | "rose" | "sky"; hint?: string }) {
  const toneClass = {
    stone: "text-stone-900",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    sky: "text-sky-700",
  }[tone];
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-1 tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-stone-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{title}</span>
        {subtitle && <span className="text-[10px] text-stone-400 mt-0.5">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-500">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${it.color}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Th({ label, col, sortCol, arrow, toggle, align = "right" }: {
  label: string; col: SortCol; sortCol: SortCol;
  arrow: (c: SortCol) => string; toggle: (c: SortCol) => void;
  align?: "left" | "right" | "center";
}) {
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const text = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`px-2 py-1.5 font-medium ${text}`}>
      <button type="button" onClick={() => toggle(col)}
        className={`w-full font-medium hover:text-stone-700 transition flex items-center gap-1 ${justify} ${sortCol === col ? "text-stone-700" : ""}`}>
        <span>{label}{arrow(col)}</span>
      </button>
    </th>
  );
}

// ── Shared chart primitives ───────────────────────────────────────────
const W = 640, H = 220;
const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

function YGrid({ padL, padR, padT, innerH, yMin = 0, yMax, showDollars }: {
  padL: number; padR: number; padT: number; innerH: number; yMin?: number; yMax: number; showDollars: boolean;
}) {
  const range = yMax - yMin || 1;
  return (
    <g>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + innerH * (1 - t);
        const v = yMin + range * t;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e7e5e4" strokeWidth={1} strokeDasharray={t === 0 || t === 1 ? "" : "2,3"} />
            <text x={padL - 6} y={y + 3} fontSize={9} fill="#a8a29e" textAnchor="end">{showDollars ? fmtCompact(v) : "•••"}</text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({
  idxs, xAt, ys, labels, rotate = false,
}: { idxs: number[]; xAt: (i: number) => number; ys: number; labels: string[]; rotate?: boolean }) {
  return (
    <g>
      {idxs.map((i) => (
        <text
          key={i}
          x={xAt(i)}
          y={ys}
          fontSize={9}
          fill="#a8a29e"
          textAnchor="middle"
          transform={rotate ? `rotate(-35, ${xAt(i)}, ${ys})` : undefined}
        >
          {labels[i]}
        </text>
      ))}
    </g>
  );
}

// ── Chart 1: Sim vs Actual line chart ─────────────────────────────────
function LineChart({
  rows, showDollars, fmt,
}: { rows: CachedSnapshot[]; showDollars: boolean; fmt: (n: number) => string }) {
  const padL = 50, padR = 14, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  if (rows.length < 2) return <Empty>Need at least 2 snapshots to plot a trend.</Empty>;

  const all = rows.flatMap((r) => [r.payload.simulation.total, r.payload.actual.total]);
  const yMax = niceMax(Math.max(...all) * 1.05);
  const yMin = Math.max(0, Math.floor(Math.min(...all) * 0.95));
  const yRange = yMax - yMin || 1;

  const xAt = (i: number) => padL + (i / (rows.length - 1)) * innerW;
  const yAt = (v: number) => padT + innerH - ((v - yMin) / yRange) * innerH;
  const path = (key: "simulation" | "actual") =>
    rows.map((r, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(r.payload[key].total)}`).join(" ");

  const labels = rows.map((r) => monthLabel(r.snapshotDate));
  const xLabelIdxs = [0, Math.floor((rows.length - 1) / 2), rows.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <YGrid padL={padL} padR={padR} padT={padT} innerH={innerH} yMin={yMin} yMax={yMax} showDollars={showDollars} />
      <path d={path("simulation")} fill="none" stroke="#0ea5e9" strokeWidth={2} />
      <path d={path("actual")} fill="none" stroke="#44403c" strokeWidth={2} />
      {rows.map((r, i) => (
        <g key={r.snapshotDate}>
          <circle cx={xAt(i)} cy={yAt(r.payload.simulation.total)} r={2.5} fill="#0ea5e9">
            <title>{`${labels[i]} sim: ${fmt(r.payload.simulation.total)}`}</title>
          </circle>
          <circle cx={xAt(i)} cy={yAt(r.payload.actual.total)} r={2.5} fill="#44403c">
            <title>{`${labels[i]} actual: ${fmt(r.payload.actual.total)}`}</title>
          </circle>
        </g>
      ))}
      <XLabels idxs={xLabelIdxs} xAt={xAt} ys={H - 10} labels={labels} />
    </svg>
  );
}

// ── Chart 2: Monthly delta vertical bars ─────────────────────────────
function DeltaBars({
  rows, showDollars, fmt,
}: { rows: CachedSnapshot[]; showDollars: boolean; fmt: (n: number) => string }) {
  const padL = 38, padR = 14, padT = 12, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  if (rows.length === 0) return <Empty>No data.</Empty>;

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.deltaAbsolute)), 1);
  const yMax = niceMax(maxAbs);
  const yScale = (v: number) => (v / yMax) * (innerH / 2);
  const zeroY = padT + innerH / 2;

  const tierFill = (s: CachedSnapshot) => {
    const t = Math.abs(s.deltaAbsolute) / maxAbs;
    const isRed = s.favorableToHold;
    if (t >= 0.75) return isRed ? "#f43f5e" : "#10b981";
    if (t >= 0.5)  return isRed ? "#fb7185" : "#34d399";
    if (t >= 0.25) return isRed ? "#fda4af" : "#6ee7b7";
    return isRed ? "#fecdd3" : "#a7f3d0";
  };

  const slot = innerW / rows.length;
  const barW = Math.max(4, slot * 0.62);
  const step = Math.max(1, Math.ceil(rows.length / 7));
  const labels = rows.map((r) => monthLabel(r.snapshotDate));
  const idxs = rows.map((_, i) => i).filter((i) => i % step === 0);
  const cxAt = (i: number) => padL + slot * i + slot / 2;
  const cap = showDollars ? fmtCompact(yMax) : "•••";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#a8a29e" strokeWidth={1} />
      <text x={padL - 6} y={padT + 8} fontSize={9} fill="#a8a29e" textAnchor="end">+{cap}</text>
      <text x={padL - 6} y={zeroY + 3} fontSize={9} fill="#a8a29e" textAnchor="end">0</text>
      <text x={padL - 6} y={H - padB + 8} fontSize={9} fill="#a8a29e" textAnchor="end">−{cap}</text>
      {rows.map((r, i) => {
        const cx = cxAt(i);
        const x = cx - barW / 2;
        const h = yScale(Math.abs(r.deltaAbsolute));
        const goesUp = !r.favorableToHold;
        const y = goesUp ? zeroY - h : zeroY;
        const sign = r.deltaAbsolute >= 0 ? "+" : "";
        return (
          <rect key={r.snapshotDate} x={x} y={y} width={barW} height={h} fill={tierFill(r)} rx={1.5}>
            <title>{`${labels[i]}: ${showDollars ? sign + fmt(r.deltaAbsolute) : fmt(r.deltaAbsolute)} (${r.favorableToHold ? "would've benefited from stopping" : "trading worked"})`}</title>
          </rect>
        );
      })}
      <XLabels idxs={idxs} xAt={cxAt} ys={H - 12} labels={labels} rotate={rows.length > 8} />
    </svg>
  );
}

// ── Chart 3: Cumulative realized vs tax line chart ────────────────────
function CumulativeLineChart({
  rows, showDollars, fmt,
}: { rows: CachedSnapshot[]; showDollars: boolean; fmt: (n: number) => string }) {
  const padL = 50, padR = 14, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  if (rows.length < 2) return <Empty>Need at least 2 snapshots.</Empty>;

  // Each snapshot's realizedGains represents "if I stopped on date X, gains
  // accumulated between X and today." Plot directly to show the answer
  // shrinking as the snapshot window narrows toward today.
  const series = rows.map((r) => ({
    date: r.snapshotDate,
    realized: r.payload.realizedGains?.total ?? 0,
    tax: r.payload.realizedGains?.estimatedTax ?? 0,
  }));
  const yMax = niceMax(Math.max(...series.flatMap((s) => [s.realized, s.tax]), 1));

  const xAt = (i: number) => padL + (i / (series.length - 1)) * innerW;
  const yAt = (v: number) => padT + innerH - (v / yMax) * innerH;
  const pathFor = (key: "realized" | "tax") =>
    series.map((s, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(s[key])}`).join(" ");

  const labels = series.map((s) => monthLabel(s.date));
  const xLabelIdxs = [0, Math.floor((series.length - 1) / 2), series.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <YGrid padL={padL} padR={padR} padT={padT} innerH={innerH} yMax={yMax} showDollars={showDollars} />
      <path d={pathFor("realized")} fill="none" stroke="#10b981" strokeWidth={2} />
      <path d={pathFor("tax")} fill="none" stroke="#f43f5e" strokeWidth={2} />
      {series.map((s, i) => (
        <g key={s.date}>
          <circle cx={xAt(i)} cy={yAt(s.realized)} r={2.5} fill="#10b981">
            <title>{`${labels[i]} realized: ${fmt(s.realized)}`}</title>
          </circle>
          <circle cx={xAt(i)} cy={yAt(s.tax)} r={2.5} fill="#f43f5e">
            <title>{`${labels[i]} tax: ${fmt(s.tax)}`}</title>
          </circle>
        </g>
      ))}
      <XLabels idxs={xLabelIdxs} xAt={xAt} ys={H - 10} labels={labels} />
    </svg>
  );
}

// ── Chart 4: Inflows stacked bars (cash + RSU) ────────────────────────
function InflowBars({
  rows, showDollars, fmt,
}: {
  rows: { snapshot: CachedSnapshot; cashDepositsDelta: number; rsuVestsDelta: number }[];
  showDollars: boolean;
  fmt: (n: number) => string;
}) {
  const padL = 50, padR = 14, padT = 14, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Drop the oldest row (its deltas are zero by construction).
  const visible = rows.filter((r, i) => i > 0 || r.cashDepositsDelta > 0 || r.rsuVestsDelta > 0);
  if (visible.length === 0) return <Empty>No inflows tracked.</Empty>;

  const yMax = niceMax(Math.max(...visible.map((r) => r.cashDepositsDelta + r.rsuVestsDelta), 1));
  const yScale = (v: number) => (v / yMax) * innerH;
  const baseY = padT + innerH;
  const slot = innerW / visible.length;
  const barW = Math.max(4, slot * 0.62);
  const step = Math.max(1, Math.ceil(visible.length / 7));
  const labels = visible.map((r) => monthLabel(r.snapshot.snapshotDate));
  const idxs = visible.map((_, i) => i).filter((i) => i % step === 0);
  const cxAt = (i: number) => padL + slot * i + slot / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <YGrid padL={padL} padR={padR} padT={padT} innerH={innerH} yMax={yMax} showDollars={showDollars} />
      {visible.map((r, i) => {
        const cx = cxAt(i);
        const x = cx - barW / 2;
        const cashH = yScale(r.cashDepositsDelta);
        const rsuH = yScale(r.rsuVestsDelta);
        const cashY = baseY - cashH;
        const rsuY = cashY - rsuH;
        return (
          <g key={r.snapshot.snapshotDate}>
            {cashH > 0 && (
              <rect x={x} y={cashY} width={barW} height={cashH} fill="#f59e0b" rx={1.5}>
                <title>{`${labels[i]} cash: ${fmt(r.cashDepositsDelta)}`}</title>
              </rect>
            )}
            {rsuH > 0 && (
              <rect x={x} y={rsuY} width={barW} height={rsuH} fill="#14b8a6" rx={1.5}>
                <title>{`${labels[i]} RSU: ${fmt(r.rsuVestsDelta)}`}</title>
              </rect>
            )}
          </g>
        );
      })}
      <XLabels idxs={idxs} xAt={cxAt} ys={H - 12} labels={labels} rotate={visible.length > 8} />
    </svg>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-stone-400 py-6 text-center">{children}</div>;
}
