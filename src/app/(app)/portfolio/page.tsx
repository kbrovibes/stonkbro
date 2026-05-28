"use client";

import { useState, useEffect, useCallback } from "react";
import { useRefreshEvent } from "@/hooks/useRefreshEvent";
import type { OptionChain, OptionLeg } from "@/lib/snaptrade/client";

function findOpenLeg(chain: OptionChain): { strike: number; expiry: string } | null {
  if (chain.status !== "OPEN" || chain.open_units === 0) return null;
  const posMap = new Map<string, number>();
  for (const leg of chain.legs) {
    if (leg.type !== "SELL" && leg.type !== "BUY") continue;
    const key = `${leg.strike}|${leg.expiry}`;
    posMap.set(key, (posMap.get(key) ?? 0) + leg.units);
  }
  for (const [key, units] of posMap.entries()) {
    if (Math.abs(units) > 0.01) {
      const [s, e] = key.split("|");
      return { strike: Number(s), expiry: e };
    }
  }
  return null;
}

interface PutCapitalMonthData {
  peak: number;
  peakDate: string;
}

// Track peak PUT collateral locked per calendar month, including the exact date of the peak
function computePutCapitalPeaks(chains: OptionChain[]): Map<string, PutCapitalMonthData> {
  type Ev = { dateStr: string; delta: number };
  const events: Ev[] = [];
  for (const chain of chains) {
    if (chain.option_type.toUpperCase() !== "PUT") continue;
    let chainRunning = 0;
    for (const leg of chain.legs) {
      if (leg.type === "SELL") {
        const amt = Math.abs(leg.units) * leg.strike * 100;
        chainRunning += amt;
        events.push({ dateStr: leg.date, delta: amt });
      } else if (leg.type === "BUY") {
        const amt = Math.abs(leg.units) * leg.strike * 100;
        chainRunning = Math.max(0, chainRunning - amt);
        events.push({ dateStr: leg.date, delta: -amt });
      } else if (leg.type === "OPTIONEXPIRATION" || leg.type === "OPTIONASSIGNMENT") {
        if (chainRunning > 0) {
          events.push({ dateStr: leg.date, delta: -chainRunning });
          chainRunning = 0;
        }
      }
    }
  }
  events.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const peaks = new Map<string, PutCapitalMonthData>();
  let running = 0;
  for (const ev of events) {
    running = Math.max(0, running + ev.delta);
    const m = ev.dateStr.substring(0, 7);
    const cur = peaks.get(m);
    if (!cur || running > cur.peak) {
      peaks.set(m, { peak: running, peakDate: ev.dateStr });
    }
  }
  return peaks;
}

// Returns active PUT positions on a given date (for collateral breakdown)
function getPutPositionsOnDate(
  chains: OptionChain[],
  date: string
): Array<{ underlying: string; strike: number; units: number; collateral: number }> {
  const result: Array<{ underlying: string; strike: number; units: number; collateral: number }> = [];
  for (const chain of chains) {
    if (chain.option_type.toUpperCase() !== "PUT") continue;
    let units = 0;
    let lastStrike = 0;
    for (const leg of chain.legs) {
      if (leg.date > date) break;
      if (leg.type === "SELL" || leg.type === "BUY") {
        units += leg.units;
        lastStrike = leg.strike;
      } else if (leg.type === "OPTIONEXPIRATION" || leg.type === "OPTIONASSIGNMENT") {
        units = 0;
      }
    }
    const absUnits = Math.abs(units);
    if (absUnits > 0 && lastStrike > 0) {
      result.push({ underlying: chain.underlying, strike: lastStrike, units: absUnits, collateral: lastStrike * 100 * absUnits });
    }
  }
  return result.filter(p => p.collateral > 0);
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtMonth(m: string) {
  const [year, month] = m.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtMonthShort(m: string) {
  const [year, month] = m.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short" });
}

type FilterTab = "Open" | "Closed" | "Assigned" | "Monthly";

// Annualized return on collateral for closed PUT chains
function annualizedReturnPct(chain: OptionChain): number | null {
  if (chain.option_type.toUpperCase() !== "PUT") return null;
  if (chain.status === "OPEN") return null;
  const firstSell = chain.legs.find(l => l.type === "SELL");
  if (!firstSell || firstSell.strike === 0) return null;
  const collateral = firstSell.strike * 100 * Math.abs(firstSell.units);
  if (collateral === 0) return null;
  const start = new Date(chain.start_date);
  const end = chain.end_date ? new Date(chain.end_date) : new Date();
  const days = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  return (chain.net_pnl / collateral) * (365 / days) * 100;
}

const STATUS_BADGE: Record<string, string> = {
  OPEN:     "bg-sky-100 text-sky-700",
  CLOSED:   "bg-stone-100 text-stone-600",
  EXPIRED:  "bg-emerald-100 text-emerald-700",
  ASSIGNED: "bg-violet-100 text-violet-700",
};

function legColor(leg: OptionLeg): string {
  if (leg.type === "OPTIONEXPIRATION") return "text-stone-400";
  if (leg.type === "OPTIONASSIGNMENT") return "text-violet-500";
  if (leg.amount > 0) return "text-emerald-600";
  return "text-rose-600";
}

function isRoll(legs: OptionLeg[], i: number): boolean {
  if (i === 0) return false;
  const prev = legs[i - 1];
  const curr = legs[i];
  if (curr.type !== "SELL" && curr.type !== "BUY") return false;
  const diff = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / 86400000;
  return diff <= 1 && curr.strike !== prev.strike && curr.type !== prev.type;
}

function PnlChart({
  periods,
  pnlValues,
  peakValues,
  putCapData,
  fmtLabel,
  fmtShort,
  ytdReturnPct,
  title = "P&L",
}: {
  periods: string[];
  pnlValues: number[];
  peakValues: number[];
  putCapData: Map<string, PutCapitalMonthData>;
  fmtLabel: (k: string) => string;
  fmtShort: (k: string) => string;
  ytdReturnPct: number | null;
  title?: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  if (periods.length === 0) return null;

  const maxAbsPnl = Math.max(...pnlValues.map(Math.abs), 1);
  const maxPeak   = Math.max(...peakValues, 1);

  // Split layout: collateral section on top, P&L section on bottom — independent Y-axes
  const W = 400;
  const PAD_L = 52;
  const PAD_R = 56;
  const PAD_T = 10;
  const COLL_H = 68;   // collateral bars fill this height (0 at bottom, maxPeak at top)
  const SEP    = 6;    // gap between sections
  const PNL_H  = 80;   // P&L bars: zero at center, ±maxAbsPnl at edges
  const PAD_B  = 22;
  const H = PAD_T + COLL_H + SEP + PNL_H + PAD_B;

  const chartW   = W - PAD_L - PAD_R;
  const collTop  = PAD_T;
  const collZero = PAD_T + COLL_H;          // "zero" baseline for collateral
  const pnlTop   = collZero + SEP;
  const pnlMid   = pnlTop + PNL_H / 2;     // "zero" baseline for P&L
  const pnlBot   = pnlTop + PNL_H;

  const n = periods.length;
  const step = chartW / n;
  const barW = Math.max(3, Math.floor(step * 0.5));

  function cx(i: number)   { return PAD_L + i * step + step / 2; }
  function collY(v: number){ return collZero - (v / maxPeak)   * COLL_H; }
  function pnlY(v: number) { return pnlMid   - (v / maxAbsPnl) * (PNL_H / 2); }

  const tooltip = activeIdx !== null ? {
    period:    periods[activeIdx],
    pnl:       pnlValues[activeIdx],
    collateral:peakValues[activeIdx],
    peakDate:  putCapData.get(periods[activeIdx])?.peakDate ?? null,
    returnPct: peakValues[activeIdx] > 0 ? (pnlValues[activeIdx] / peakValues[activeIdx]) * 100 : null,
  } : null;

  return (
    <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-3 text-[10px] text-stone-400">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-amber-300" /> Collateral</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-emerald-400" /> P&amp;L</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setActiveIdx(null)}
      >
        {/* Section labels */}
        <text x={PAD_L + 3} y={collTop + 9} fontSize={7} fill="#d97706" fontWeight="600" letterSpacing="0.04em">COLLATERAL</text>
        <text x={PAD_L + 3} y={pnlTop + 10} fontSize={7} fill="#78716c" fontWeight="600" letterSpacing="0.04em">P&amp;L</text>

        {/* Collateral zero line */}
        <line x1={PAD_L} y1={collZero} x2={W - PAD_R} y2={collZero} stroke="#fde68a" strokeWidth={1} />
        {/* P&L zero line */}
        <line x1={PAD_L} y1={pnlMid} x2={W - PAD_R} y2={pnlMid} stroke="#e7e5e4" strokeWidth={1} />
        {/* Section divider */}
        <line x1={PAD_L} y1={collZero + SEP / 2} x2={W - PAD_R} y2={collZero + SEP / 2} stroke="#f5f5f4" strokeWidth={1} strokeDasharray="3,2" />

        {/* Collateral Y-axis (right side): 0 at bottom, maxPeak at top */}
        {[0, 0.5, 1].map((f, i) => {
          const v = f * maxPeak;
          const y = collY(v);
          return (
            <g key={i}>
              <line x1={W - PAD_R} y1={y} x2={W - PAD_R + 3} y2={y} stroke="#fcd34d" strokeWidth={1} />
              <text x={W - PAD_R + 5} y={y + 3.5} textAnchor="start" fontSize={8} fill="#d97706">{fmtK(v)}</text>
            </g>
          );
        })}

        {/* P&L Y-axis (left side): -max at bottom, 0 center, +max at top */}
        {[-1, 0, 1].map((f, i) => {
          const v = f * maxAbsPnl;
          const y = pnlY(v);
          return (
            <g key={i}>
              <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y} stroke="#d6d3d1" strokeWidth={1} />
              <text x={PAD_L - 5} y={y + 3.5} textAnchor="end" fontSize={8} fill="#a8a29e">{fmtK(v)}</text>
            </g>
          );
        })}

        {/* Bars */}
        {periods.map((_, i) => {
          const pnl  = pnlValues[i];
          const coll = peakValues[i];
          const x = cx(i);
          const isActive = activeIdx === i;

          const collBarH = coll > 0 ? Math.max(1, (coll / maxPeak) * COLL_H) : 0;
          const pnlBarH  = Math.max(1, Math.abs(pnl / maxAbsPnl) * (PNL_H / 2));
          const pnlBarY  = pnl >= 0 ? pnlY(pnl) : pnlMid;

          return (
            <g key={i}>
              {/* Hit area spanning both sections */}
              <rect
                x={x - step / 2} y={collTop} width={step} height={pnlBot - collTop}
                fill={isActive ? "rgba(0,0,0,0.03)" : "transparent"}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i === activeIdx ? null : i)}
              />
              {/* Collateral bar (top section) */}
              {coll > 0 && (
                <rect
                  x={x - barW / 2} y={collY(coll)}
                  width={barW} height={collBarH}
                  fill={isActive ? "#f59e0b" : "#fcd34d"} rx={1}
                  pointerEvents="none"
                />
              )}
              {/* P&L bar (bottom section) */}
              <rect
                x={x - barW / 2} y={pnlBarY}
                width={barW} height={pnlBarH}
                fill={pnl >= 0 ? "#34d399" : "#f87171"} rx={1}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {periods.map((p, i) => (
          <text key={i} x={cx(i)} y={H - 5} textAnchor="middle" fontSize={8} fill={activeIdx === i ? "#57534e" : "#a8a29e"}>
            {fmtShort(p)}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && activeIdx !== null && (() => {
          const x = cx(activeIdx);
          const flipLeft = x > W * 0.6;
          const lines = [
            fmtLabel(tooltip.period),
            `P&L: ${tooltip.pnl >= 0 ? "+" : ""}${fmtCurrency(tooltip.pnl)}`,
            tooltip.collateral > 0 ? `Collateral: ${fmtCurrency(tooltip.collateral)}` : null,
            tooltip.peakDate ? `Peak: ${fmtDate(tooltip.peakDate)}` : null,
            tooltip.returnPct !== null ? `Return: ${tooltip.returnPct.toFixed(1)}%` : null,
          ].filter(Boolean) as string[];
          const bW = 155;
          const bH = lines.length * 13 + 8;
          const bX = flipLeft ? x - bW - 4 : x + 4;
          const bY = collTop + 2;
          return (
            <g pointerEvents="none">
              <rect x={bX} y={bY} width={bW} height={bH} rx={4} fill="white" stroke="#e7e5e4" strokeWidth={1} />
              {lines.map((line, j) => (
                <text key={j} x={bX + 7} y={bY + 14 + j * 13} fontSize={9}
                  fill={j === 0 ? "#1c1917" : "#57534e"} fontWeight={j === 0 ? "bold" : "normal"}>
                  {line}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>

      {ytdReturnPct !== null && (
        <div className="px-4 pb-3 pt-2 border-t border-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-400">Return on peak PUT collateral</span>
          <span className={`text-sm font-bold ${ytdReturnPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {ytdReturnPct >= 0 ? "+" : ""}{ytdReturnPct.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function ChainCard({ chain }: { chain: OptionChain }) {
  const [expanded, setExpanded] = useState(false);
  const [liveQuote, setLiveQuote] = useState<{ bid: number; mid: number; ask: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const dateRange = chain.end_date
    ? `${fmtDate(chain.start_date)} → ${fmtDate(chain.end_date)}`
    : `${fmtDate(chain.start_date)} → now`;

  const isOpenWithUnits = chain.status === "OPEN" && chain.open_units !== 0;
  const breakevenClose = isOpenWithUnits
    ? chain.net_pnl / Math.abs(chain.open_units) / 100
    : null;

  const openLeg = findOpenLeg(chain);
  // Capital locked only applies to PUTs (covered calls don't require collateral)
  const isPut = chain.option_type.toUpperCase() === "PUT";
  const capitalLocked = isPut && isOpenWithUnits && openLeg
    ? openLeg.strike * 100 * Math.abs(chain.open_units)
    : null;

  async function fetchLiveQuote() {
    if (!openLeg) return;
    setQuoteLoading(true);
    setQuoteError(null);
    setLiveQuote(null);
    try {
      const params = new URLSearchParams({
        underlying: chain.underlying,
        option_type: chain.option_type,
        strike: String(openLeg.strike),
        expiry: openLeg.expiry,
      });
      const res = await fetch(`/api/portfolio/close-price?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLiveQuote({ bid: data.bid, mid: data.mid, ask: data.ask });
    } catch (e: unknown) {
      setQuoteError(e instanceof Error ? e.message : "Failed to fetch quote");
    } finally {
      setQuoteLoading(false);
    }
  }

  const netAfterClose = liveQuote != null
    ? chain.net_pnl - liveQuote.mid * Math.abs(chain.open_units) * 100
    : null;

  return (
    <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-2"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-stone-900 text-sm">
              {chain.underlying} {chain.option_type}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[chain.status] ?? "bg-stone-100 text-stone-500"}`}>
              {chain.status}
            </span>
            {chain.roll_count > 0 && (
              <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                {chain.roll_count} roll{chain.roll_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">{dateRange}</div>
          {capitalLocked != null && (
            <div className="text-[11px] text-amber-600 mt-0.5">
              {fmtCurrency(capitalLocked)} collateral · {Math.abs(chain.open_units)} contract{Math.abs(chain.open_units) !== 1 ? "s" : ""}
            </div>
          )}
          {breakevenClose != null && (
            <div className={`text-[11px] mt-0.5 ${chain.net_pnl > 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {chain.net_pnl > 0
                ? `Close ≤ ${fmtCurrency(breakevenClose)} → chain profit`
                : `In the hole — close adds ${fmtCurrency(Math.abs(breakevenClose))} more loss`}
            </div>
          )}
          {(() => {
            const ret = annualizedReturnPct(chain);
            if (ret === null) return null;
            const days = chain.end_date
              ? Math.round((new Date(chain.end_date).getTime() - new Date(chain.start_date).getTime()) / 86400000)
              : null;
            return (
              <div className={`text-[11px] mt-0.5 font-medium ${ret >= 0 ? "text-sky-600" : "text-rose-400"}`}>
                {ret >= 0 ? "+" : ""}{ret.toFixed(0)}% ann. · {days ? `${days}d held` : ""}
              </div>
            );
          })()}
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`font-bold text-sm ${chain.net_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {chain.net_pnl >= 0 ? "+" : ""}{fmtCurrency(chain.net_pnl)}
          </div>
          <div className="text-[10px] text-stone-300 mt-0.5">{expanded ? "▲" : "▼"}</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-50 px-4 pb-3">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-stone-400 border-b border-stone-50">
                <th className="text-left pb-1 font-medium">Date</th>
                <th className="text-left pb-1 font-medium">Type</th>
                <th className="text-right pb-1 font-medium">Strike</th>
                <th className="text-right pb-1 font-medium">Expiry</th>
                <th className="text-right pb-1 font-medium">Qty</th>
                <th className="text-right pb-1 font-medium">Price</th>
                <th className="text-right pb-1 font-medium">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {chain.legs.map((leg, i) => (
                <tr key={i} className="border-b border-stone-50 last:border-0">
                  <td className="py-1.5 text-stone-500">{fmtDate(leg.date)}</td>
                  <td className={`py-1.5 font-semibold ${legColor(leg)}`}>
                    {leg.type}
                    {isRoll(chain.legs, i) && (
                      <span className="ml-1 bg-amber-100 text-amber-600 px-1 py-0.5 rounded text-[10px] font-bold">ROLL</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-stone-700">${leg.strike}</td>
                  <td className="py-1.5 text-right text-stone-500">{fmtDate(leg.expiry)}</td>
                  <td className="py-1.5 text-right text-stone-700">{leg.units > 0 ? "+" : ""}{leg.units}</td>
                  <td className="py-1.5 text-right text-stone-500">{leg.price > 0 ? fmtCurrency(leg.price) : "—"}</td>
                  <td className={`py-1.5 text-right font-semibold ${leg.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {leg.amount !== 0 ? (leg.amount >= 0 ? "+" : "") + fmtCurrency(leg.amount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-400">{chain.legs.length} leg{chain.legs.length !== 1 ? "s" : ""}</span>
            <span className={`font-bold text-sm ${chain.net_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              Net {chain.net_pnl >= 0 ? "+" : ""}{fmtCurrency(chain.net_pnl)}
            </span>
          </div>

          {isOpenWithUnits && openLeg && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-400">
                  Open: ${openLeg.strike} {fmtDate(openLeg.expiry)}
                </span>
                <button
                  onClick={fetchLiveQuote}
                  disabled={quoteLoading}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50 transition-colors"
                >
                  {quoteLoading ? "Loading..." : "Get Live Quote"}
                </button>
              </div>

              {quoteError && (
                <p className="text-[11px] text-rose-500 mt-1.5">{quoteError}</p>
              )}

              {liveQuote && (
                <div className="mt-2 bg-stone-50 rounded-lg px-3 py-2 flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">Bid / Mid / Ask</span>
                    <span className="text-stone-700 font-medium">
                      {fmtCurrency(liveQuote.bid)} / {fmtCurrency(liveQuote.mid)} / {fmtCurrency(liveQuote.ask)}
                    </span>
                  </div>
                  {netAfterClose != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400">If closed now</span>
                      <span className={`font-semibold ${netAfterClose >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {netAfterClose >= 0
                          ? `Chain profit of +${fmtCurrency(netAfterClose)}`
                          : `Still ${fmtCurrency(Math.abs(netAfterClose))} in the hole`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MonthlyView({ chains }: { chains: OptionChain[] }) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [expandedFuture, setExpandedFuture] = useState<Set<string>>(new Set([currentMonthStr]));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedCollateral, setExpandedCollateral] = useState<Set<string>>(new Set());

  const realized = chains.filter(c => c.close_month && (c.status === "CLOSED" || c.status === "EXPIRED"));
  const putCapitalData = computePutCapitalPeaks(chains);

  const byMonth = new Map<string, { pnl: number; chains: OptionChain[] }>();
  for (const c of realized) {
    const m = c.close_month!;
    if (!byMonth.has(m)) byMonth.set(m, { pnl: 0, chains: [] });
    byMonth.get(m)!.pnl += c.net_pnl;
    byMonth.get(m)!.chains.push(c);
  }

  // Best case: only open contracts whose expiry hasn't passed yet
  const bestCaseByMonth = new Map<string, { gain: number; chains: OptionChain[] }>();
  for (const c of chains) {
    if (c.status !== "OPEN" || c.open_units === 0) continue;
    const leg = findOpenLeg(c);
    if (!leg || leg.expiry < todayStr) continue;
    const expMonth = leg.expiry.substring(0, 7);
    if (!bestCaseByMonth.has(expMonth)) bestCaseByMonth.set(expMonth, { gain: 0, chains: [] });
    bestCaseByMonth.get(expMonth)!.gain += c.net_pnl;
    bestCaseByMonth.get(expMonth)!.chains.push(c);
  }
  const bestCaseMonths = Array.from(bestCaseByMonth.keys()).sort();

  const allMonths = Array.from(new Set([...byMonth.keys(), ...putCapitalData.keys()])).sort();
  const chartPnl = allMonths.map(m => byMonth.get(m)?.pnl ?? 0);
  const chartPeak = allMonths.map(m => putCapitalData.get(m)?.peak ?? 0);
  const totalPnl = chartPnl.reduce((s, v) => s + v, 0);
  const maxPeak = Math.max(...chartPeak, 0);
  const overallReturnPct = maxPeak > 0 ? (totalPnl / maxPeak) * 100 : null;

  const months = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
    setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Best-case unsettled — future only */}
      {bestCaseMonths.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-stone-400 font-medium px-1">
            Unsettled · best case if all expire worthless
          </div>
          {bestCaseMonths.map(month => {
            const data = bestCaseByMonth.get(month)!;
            const isThisMonth = month === currentMonthStr;
            const isExpanded = expandedFuture.has(month);
            return (
              <div key={month} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => { if (!isThisMonth) toggleSet(setExpandedFuture, month); }}
                >
                  <div className="text-left">
                    <div className="font-semibold text-sm text-stone-900">{fmtMonth(month)}</div>
                    <div className="text-xs text-amber-600">{data.chains.length} open · best case</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-amber-700">+{fmtCurrency(data.gain)}</span>
                    {!isThisMonth && <span className="text-stone-400 text-xs">{isExpanded ? "▲" : "▼"}</span>}
                  </div>
                </button>
                {(isThisMonth || isExpanded) && (
                  <div className="flex flex-col gap-0.5 mt-2 pt-2 border-t border-amber-100">
                    {data.chains.map((c, i) => {
                      const leg = findOpenLeg(c);
                      return (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-stone-500">
                            {c.underlying} {c.option_type} ${leg?.strike}
                            {Math.abs(c.open_units) > 1 && <span className="text-stone-400"> ×{Math.abs(c.open_units)}</span>}
                            {" "}exp {fmtDate(leg?.expiry ?? null)}
                          </span>
                          <span className="font-medium text-amber-700">+{fmtCurrency(c.net_pnl)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PnlChart
        periods={allMonths}
        pnlValues={chartPnl}
        peakValues={chartPeak}
        putCapData={putCapitalData}
        fmtLabel={fmtMonth}
        fmtShort={fmtMonthShort}
        ytdReturnPct={overallReturnPct}
        title="Monthly P&L"
      />

      {months.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">All Realized</span>
          <span className={`font-bold text-lg ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {totalPnl >= 0 ? "+" : ""}{fmtCurrency(totalPnl)}
          </span>
        </div>
      )}

      {months.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-8">No closed positions</p>
      ) : (() => {
        const items: React.ReactNode[] = [];
        let lastYear = "";
        for (const [month, { pnl, chains: mChains }] of months) {
          const yr = month.slice(0, 4);
          if (lastYear && yr !== lastYear) {
            items.push(
              <div key={`sep-${yr}`} className="flex items-center gap-2 px-1 py-1">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{yr}</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
            );
          }
          lastYear = yr;

          const isOpen = expandedMonths.has(month);
          const winners = mChains.filter(c => c.net_pnl > 0).length;
          const losers  = mChains.filter(c => c.net_pnl <= 0).length;
          const byUnderlying = mChains.reduce<Record<string, number>>((acc, c) => {
            const k = `${c.underlying} ${c.option_type}`;
            acc[k] = (acc[k] ?? 0) + c.net_pnl;
            return acc;
          }, {});
          const capData = putCapitalData.get(month);
          const peakPositions = capData ? getPutPositionsOnDate(chains, capData.peakDate) : [];
          const monthReturnPct = capData && capData.peak > 0 ? (pnl / capData.peak) * 100 : null;
          const isCollOpen = expandedCollateral.has(month);

          items.push(
            <div key={month} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
              {/* Header — always visible, click to expand */}
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => toggleSet(setExpandedMonths, month)}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm text-stone-900">{fmtMonth(month)}</div>
                  <div className="text-xs text-stone-400">{mChains.length} chain{mChains.length !== 1 ? "s" : ""} · {winners}W / {losers}L</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={`font-bold text-base ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {pnl >= 0 ? "+" : ""}{fmtCurrency(pnl)}
                    </div>
                    {monthReturnPct !== null && (
                      <div className="text-[11px] text-stone-400">
                        {monthReturnPct >= 0 ? "+" : ""}{monthReturnPct.toFixed(1)}% on collateral
                      </div>
                    )}
                  </div>
                  <span className="text-stone-300 text-xs ml-1">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-3 border-t border-stone-50">
                  {/* P&L by underlying */}
                  <div className="flex flex-col gap-0.5 pt-2">
                    {Object.entries(byUnderlying)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-stone-500">{key}</span>
                          <span className={`font-medium ${val >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {val >= 0 ? "+" : ""}{fmtCurrency(val)}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Peak collateral — foldable */}
                  {capData && capData.peak > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-50">
                      <button
                        className="w-full flex items-center justify-between"
                        onClick={() => toggleSet(setExpandedCollateral, month)}
                      >
                        <span className="text-[11px] font-medium text-amber-600">
                          Peak PUT collateral · {fmtDate(capData.peakDate)}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-amber-700">{fmtCurrency(capData.peak)}</span>
                          <span className="text-stone-300 text-xs">{isCollOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {isCollOpen && (
                        <div className="mt-1.5">
                          <p className="text-[10px] text-stone-400 mb-1.5 italic">
                            Snapshot on peak date. Contracts closing later show P&amp;L in their own month.
                          </p>
                          {peakPositions.map((pos, j) => (
                            <div key={j} className="flex justify-between text-[10px] pl-2">
                              <span className="text-stone-400">
                                {pos.underlying} PUT ${pos.strike} × {pos.units} contract{pos.units !== 1 ? "s" : ""}
                              </span>
                              <span className="text-amber-600 font-medium">{fmtCurrency(pos.collateral)}</span>
                            </div>
                          ))}
                          {peakPositions.length > 1 && (
                            <div className="flex justify-between text-[10px] pl-2 pt-0.5 border-t border-stone-50 mt-0.5">
                              <span className="text-stone-400">Total</span>
                              <span className="text-amber-700 font-semibold">
                                {fmtCurrency(peakPositions.reduce((s, p) => s + p.collateral, 0))}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
        return items;
      })()}
    </div>
  );
}

export default function PortfolioPage() {
  const [chains, setChains] = useState<OptionChain[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("Open");
  type OpenSort = "expiry" | "collateral" | "pnl" | "type" | "ticker";
  const [openSort, setOpenSort] = useState<OpenSort>("expiry");
  type ClosedSort = "date" | "pnl" | "annReturn" | "ticker" | "type";
  const [closedSort, setClosedSort] = useState<ClosedSort>("date");

  const fetchChains = useCallback(() => {
    setLoading(true);
    fetch("/api/portfolio?include=option-chains&startDate=2025-01-01")
      .then(async (r) => {
        if (r.status === 403) throw new Error("Access restricted");
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail ? `${r.status}: ${body.detail}` : `Failed to load chains (${r.status})`);
        }
        return r.json();
      })
      .then((d) => setChains(d.chains ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchChains(); }, [fetchChains]);
  useRefreshEvent(fetchChains);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-8 bg-stone-100 rounded-lg animate-pulse w-56" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-8 text-center">
        <div className="text-3xl">🔒</div>
        <p className="text-stone-700 font-medium">{error}</p>
        {error === "Access restricted" && (
          <p className="text-xs text-stone-400">This page is only available for certain accounts.</p>
        )}
      </div>
    );
  }

  if (!chains) return null;

  const open     = chains.filter(c => c.status === "OPEN");
  const currentYear = new Date().getFullYear().toString();
  const closed   = chains.filter(c => c.status === "CLOSED" || c.status === "EXPIRED");
  const assigned = chains.filter(c => c.status === "ASSIGNED");
  // Header total is current-year only
  const closedPnl = closed
    .filter(c => c.end_date?.startsWith(currentYear))
    .reduce((s, c) => s + c.net_pnl, 0);

  // Capital locked = PUT collateral only (covered calls don't lock cash)
  const openPuts = open.filter(c => c.option_type.toUpperCase() === "PUT");
  const capitalLocked = openPuts.reduce((sum, c) => {
    if (c.open_units === 0) return sum;
    const leg = findOpenLeg(c);
    if (!leg) return sum;
    return sum + leg.strike * 100 * Math.abs(c.open_units);
  }, 0);

  const TABS: FilterTab[] = ["Open", "Closed", "Assigned", "Monthly"];

  const sortedOpen = [...open].sort((a, b) => {
    switch (openSort) {
      case "expiry": {
        const ea = findOpenLeg(a)?.expiry ?? "9999";
        const eb = findOpenLeg(b)?.expiry ?? "9999";
        return ea.localeCompare(eb);
      }
      case "collateral": {
        const legA = findOpenLeg(a);
        const legB = findOpenLeg(b);
        const ca = a.option_type.toUpperCase() === "PUT" && legA ? legA.strike * 100 * Math.abs(a.open_units) : 0;
        const cb = b.option_type.toUpperCase() === "PUT" && legB ? legB.strike * 100 * Math.abs(b.open_units) : 0;
        return cb - ca;
      }
      case "pnl":
        return b.net_pnl - a.net_pnl;
      case "type":
        return a.option_type.localeCompare(b.option_type);
      case "ticker":
        return a.underlying.localeCompare(b.underlying);
      default:
        return 0;
    }
  });

  const sortedClosed = [...closed].sort((a, b) => {
    switch (closedSort) {
      case "date":      return (b.end_date ?? "").localeCompare(a.end_date ?? "");
      case "pnl":       return b.net_pnl - a.net_pnl;
      case "annReturn": {
        const ra = annualizedReturnPct(a) ?? -Infinity;
        const rb = annualizedReturnPct(b) ?? -Infinity;
        return rb - ra;
      }
      case "ticker":    return a.underlying.localeCompare(b.underlying);
      case "type":      return a.option_type.localeCompare(b.option_type);
      default:          return 0;
    }
  });

  const filtered =
    filter === "Open"     ? sortedOpen :
    filter === "Closed"   ? sortedClosed :
    filter === "Assigned" ? assigned : [];

  return (
    <div className="flex flex-col">
      {/* Summary */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white border border-stone-100 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1">Year so far</div>
              <div className={`text-2xl font-bold ${closedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {closedPnl >= 0 ? "+" : ""}{fmtCurrency(closedPnl)}
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-xs text-stone-500">Open</div>
                <div className="text-sm font-semibold">{open.length}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Closed</div>
                <div className="text-sm font-semibold">{closed.length}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Assigned</div>
                <div className="text-sm font-semibold">{assigned.length}</div>
              </div>
            </div>
          </div>
          {capitalLocked > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-600 font-medium">PUT Collateral Locked</div>
                <div className="text-[11px] text-stone-400">{openPuts.length} open put{openPuts.length !== 1 ? "s" : ""}</div>
              </div>
              <div className="text-base font-bold text-amber-700">{fmtCurrency(capitalLocked)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-2 pb-1 flex gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === t ? "bg-sky-100 text-sky-700" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sort bar — Open tab only */}
      {filter === "Open" && open.length > 0 && (
        <div className="px-4 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            ["expiry",     "Expiry"],
            ["collateral", "Collateral"],
            ["pnl",        "P&L"],
            ["type",       "Type"],
            ["ticker",     "Ticker"],
          ] as [typeof openSort, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setOpenSort(key)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                openSort === key
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Sort bar — Closed tab */}
      {filter === "Closed" && closed.length > 0 && (
        <div className="px-4 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            ["date",      "Date"],
            ["pnl",       "P&L"],
            ["annReturn", "Ann. Return"],
            ["ticker",    "Ticker"],
            ["type",      "Call/Put"],
          ] as [typeof closedSort, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setClosedSort(key)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                closedSort === key
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-4 flex flex-col gap-2 mt-1">
        {filter === "Monthly" ? (
          <MonthlyView chains={chains} />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">No {filter.toLowerCase()} positions</p>
        ) : (
          filtered.map((c, i) => <ChainCard key={i} chain={c} />)
        )}
      </div>
    </div>
  );
}
