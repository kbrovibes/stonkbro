"use client";

import { useState } from "react";

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
  actual: { total: number };
  delta: { absolute: number; pct: number; favorableToHold: boolean };
  realizedGains?: {
    options: number;
    stocks: number;
    total: number;
    estimatedTax: number;
    taxRateUsed: number;
    taxRateLabel: string;
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
  const [sortCol, setSortCol] = useState<SortCol>("todayValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir(col === "symbol" ? "asc" : "desc"); }
  }

  // Earliest date the broker has activity for — populated from API response.
  const earliestAvailable = data?.earliestAvailable ?? "2020-01-01";

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
            <span>⏰</span> Time Machine
          </h1>
          <p className="text-sm text-stone-500">If you&apos;d stopped trading on…</p>
        </div>

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
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Actual today</p>
                <p className="text-xl font-bold text-stone-900 mt-1">{fmtCurrency0(data.actual.total)}</p>
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
              const headBtn = (col: SortCol, label: string, align: "left" | "right") => (
                <button
                  type="button"
                  onClick={() => toggleSort(col)}
                  className={`w-full ${align === "right" ? "text-right" : "text-left"} font-medium hover:text-stone-700 transition`}
                >
                  {label}{arrow(col)}
                </button>
              );

              return (
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className="px-4 pt-3 pb-2">
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                      Holdings · snapshot → today
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-stone-400 border-y border-stone-100">
                          <th className="px-3 py-1.5">{headBtn("symbol", "Symbol", "left")}</th>
                          <th className="px-2 py-1.5">{headBtn("units", "Units", "right")}</th>
                          <th className="px-2 py-1.5">{headBtn("snapshotPrice", "Snap $", "right")}</th>
                          <th className="px-2 py-1.5">{headBtn("todayPrice", "Today $", "right")}</th>
                          <th className="px-2 py-1.5">{headBtn("snapshotValue", "Snap value", "right")}</th>
                          <th className="px-2 py-1.5">{headBtn("todayValue", "Today value", "right")}</th>
                          <th className="px-2 py-1.5">{headBtn("returnPct", "Return", "right")}</th>
                          <th className="px-3 py-1.5">{headBtn("contribution", "% of total", "right")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => {
                          const contributionPct = totalToday > 0 ? (r.todayValue / totalToday) * 100 : 0;
                          const retColor =
                            r.returnPct == null ? "text-stone-400"
                            : r.returnPct >= 0 ? "text-emerald-600" : "text-red-500";
                          return (
                            <tr key={r.symbol} className={`border-t border-stone-50 ${r.isCash ? "bg-amber-50/30" : ""}`}>
                              <td className="px-3 py-2 font-semibold text-stone-900">{r.symbol}</td>
                              <td className="px-2 py-2 text-right text-stone-700 tabular-nums">{r.isCash ? "—" : Math.round(r.units)}</td>
                              <td className="px-2 py-2 text-right text-stone-500 tabular-nums">{r.isCash ? "—" : (r.snapshotPrice > 0 ? fmtCurrency(r.snapshotPrice) : "—")}</td>
                              <td className="px-2 py-2 text-right text-stone-700 tabular-nums">{r.isCash ? "—" : fmtCurrency(r.todayPrice)}</td>
                              <td className="px-2 py-2 text-right text-stone-500 tabular-nums">{fmtCurrency0(r.snapshotValue)}</td>
                              <td className="px-2 py-2 text-right font-medium text-stone-900 tabular-nums">{fmtCurrency0(r.todayValue)}</td>
                              <td className={`px-2 py-2 text-right font-medium tabular-nums ${retColor}`}>
                                {r.returnPct == null ? "—" : `${r.returnPct >= 0 ? "+" : ""}${r.returnPct.toFixed(1)}%`}
                              </td>
                              <td className="px-3 py-2 text-right text-stone-500 tabular-nums">{contributionPct.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-stone-200 bg-stone-50">
                          <td className="px-3 py-2 font-bold text-stone-900">Total</td>
                          <td className="px-2 py-2" colSpan={3}></td>
                          <td className="px-2 py-2 text-right font-bold text-stone-700 tabular-nums">{fmtCurrency0(data.snapshot.total)}</td>
                          <td className="px-2 py-2 text-right font-bold text-stone-900 tabular-nums">{fmtCurrency0(totalToday)}</td>
                          <td className="px-2 py-2 text-right font-bold tabular-nums">
                            {data.snapshot.total > 0
                              ? `${((totalToday - data.snapshot.total) / data.snapshot.total * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Deposits — warm yellow */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                  Cash deposits since {fmtDate(data.snapshotDate)}
                </p>
                <p className="text-[10px] text-amber-700/70">kept in sim</p>
              </div>
              {data.simulation.deposits.length === 0 ? (
                <p className="text-xs text-amber-700/60 mt-2">No deposits in this window.</p>
              ) : (
                <div className="flex flex-col gap-0.5 mt-2">
                  {data.simulation.deposits.map((d, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-amber-900/80">{fmtDateShort(d.date)}</span>
                      <span className="font-medium text-amber-800">+{fmtCurrency(d.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pt-2 mt-1 border-t border-amber-200">
                    <span className="font-semibold text-amber-900">Total added</span>
                    <span className="font-bold text-amber-900">+{fmtCurrency(data.simulation.totalDepositsAdded)}</span>
                  </div>
                </div>
              )}
            </div>

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

            {/* Realized gains + tax context */}
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
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">Realized gains</div>
                    <div className="text-base font-bold text-stone-900">{fmtCurrency0(data.realizedGains.total)}</div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      Options: {fmtCurrency0(data.realizedGains.options)}
                      {data.realizedGains.stocks !== 0 && (
                        <> · Stock: {fmtCurrency0(data.realizedGains.stocks)}</>
                      )}
                    </div>
                  </div>
                  <div className="bg-white border border-violet-100 rounded-lg p-2.5">
                    <div className="text-[10px] uppercase text-violet-600 font-semibold mb-0.5">Est. tax owed</div>
                    <div className="text-base font-bold text-rose-600">~{fmtCurrency0(data.realizedGains.estimatedTax)}</div>
                    <div className="text-[10px] text-stone-500 mt-1">@ {(data.realizedGains.taxRateUsed * 100).toFixed(0)}% effective</div>
                  </div>
                </div>
                <p className="text-[10px] text-violet-700/80 mt-3 italic leading-snug">
                  {data.realizedGains.taxRateLabel}. Assumes income &gt; $500K. Stock realized gains
                  are best-effort (in-window BUYs only).
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
