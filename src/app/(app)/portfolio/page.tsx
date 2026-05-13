"use client";

import { useState, useEffect } from "react";
import type { OptionChain, OptionLeg } from "@/lib/snaptrade/client";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

type FilterTab = "All" | "Open" | "Closed" | "Expired";

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-700",
  CLOSED: "bg-stone-100 text-stone-600",
  EXPIRED: "bg-emerald-100 text-emerald-700",
  ASSIGNED: "bg-violet-100 text-violet-700",
};

function isRollLeg(legs: OptionLeg[], idx: number): boolean {
  if (idx === 0) return false;
  const prev = legs[idx - 1];
  const curr = legs[idx];
  // BUY preceded by SELL (or vice versa) on same or next calendar day
  if (curr.type === "BUY" || curr.type === "SELL") {
    const prevDate = new Date(prev.date).getTime();
    const currDate = new Date(curr.date).getTime();
    const diffDays = (currDate - prevDate) / 86400000;
    if (diffDays <= 1 && ((prev.type === "SELL" && curr.type === "BUY") || (prev.type === "BUY" && curr.type === "SELL"))) {
      return true;
    }
  }
  return false;
}

function legTypeColor(type: string): string {
  if (type === "SELL") return "text-emerald-600";
  if (type === "BUY") return "text-rose-600";
  return "text-stone-400";
}

function ChainCard({ chain }: { chain: OptionChain }) {
  const [expanded, setExpanded] = useState(false);

  const dateRange =
    chain.end_date
      ? `${fmtDate(chain.start_date)} → ${fmtDate(chain.end_date)}`
      : `${fmtDate(chain.start_date)} → now`;

  return (
    <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
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
          </div>
          <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
            <span>{dateRange}</span>
            {chain.roll_count > 0 && (
              <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                {chain.roll_count} roll{chain.roll_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`font-bold text-base ${chain.net_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {chain.net_pnl >= 0 ? "+" : ""}{fmtCurrency(chain.net_pnl)}
          </div>
          <div className="text-xs text-stone-300 mt-0.5">{expanded ? "▲" : "▼"}</div>
        </div>
      </button>

      {/* Legs table */}
      {expanded && (
        <div className="border-t border-stone-50 px-4 pb-3">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-stone-400 border-b border-stone-50">
                <th className="text-left pb-1 font-medium">Date</th>
                <th className="text-left pb-1 font-medium">Type</th>
                <th className="text-right pb-1 font-medium">Strike</th>
                <th className="text-right pb-1 font-medium">Expiry</th>
                <th className="text-right pb-1 font-medium">Units</th>
                <th className="text-right pb-1 font-medium">Price</th>
                <th className="text-right pb-1 font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {chain.legs.map((leg, i) => {
                const roll = isRollLeg(chain.legs, i);
                return (
                  <tr key={i} className="border-b border-stone-50 last:border-0">
                    <td className="py-1.5 text-stone-500">{fmtDate(leg.date)}</td>
                    <td className={`py-1.5 font-semibold ${legTypeColor(leg.type)}`}>
                      <span>{leg.type}</span>
                      {roll && (
                        <span className="ml-1 bg-amber-100 text-amber-600 px-1 py-0.5 rounded text-[10px] font-bold">ROLL</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-stone-700">${leg.strike}</td>
                    <td className="py-1.5 text-right text-stone-500">{fmtDate(leg.expiry)}</td>
                    <td className="py-1.5 text-right text-stone-700">{leg.units > 0 ? "+" : ""}{leg.units}</td>
                    <td className="py-1.5 text-right text-stone-500">{fmtCurrency(leg.price)}</td>
                    <td className={`py-1.5 text-right font-semibold ${leg.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {leg.amount >= 0 ? "+" : ""}{fmtCurrency(leg.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-400">{chain.legs.length} leg{chain.legs.length !== 1 ? "s" : ""}</span>
            <span className={`text-base font-bold ${chain.net_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              Net {chain.net_pnl >= 0 ? "+" : ""}{fmtCurrency(chain.net_pnl)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const [chains, setChains] = useState<OptionChain[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("All");

  useEffect(() => {
    fetch("/api/portfolio?include=option-chains&days=90")
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-28 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-8 bg-stone-100 rounded-lg animate-pulse w-48" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
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

  // Summary stats
  const closedChains = chains.filter((c) => c.status !== "OPEN");
  const openChains = chains.filter((c) => c.status === "OPEN");
  const expiredChains = chains.filter((c) => c.status === "EXPIRED");
  const assignedChains = chains.filter((c) => c.status === "ASSIGNED");
  const totalPnl = closedChains.reduce((s, c) => s + c.net_pnl, 0);

  const filterMap: Record<FilterTab, OptionChain[]> = {
    All: chains,
    Open: openChains,
    Closed: chains.filter((c) => c.status === "CLOSED"),
    Expired: chains.filter((c) => c.status === "EXPIRED" || c.status === "ASSIGNED"),
  };
  const visible = filterMap[filter];

  return (
    <div className="flex flex-col">
      {/* Summary bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-stone-900 text-white rounded-2xl p-5">
          <div className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1">Options P&L (90d)</div>
          <div className={`text-3xl font-bold tracking-tight mb-1 ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalPnl >= 0 ? "+" : ""}{fmtCurrency(totalPnl)}
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-stone-700">
            <div>
              <div className="text-xs text-stone-500">Open</div>
              <div className="text-sm font-semibold text-sky-400">{openChains.length}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Closed</div>
              <div className="text-sm font-semibold text-stone-300">{closedChains.length - expiredChains.length - assignedChains.length}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Expired</div>
              <div className="text-sm font-semibold text-emerald-400">{expiredChains.length}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Assigned</div>
              <div className="text-sm font-semibold text-violet-400">{assignedChains.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-1 flex gap-1">
        {(["All", "Open", "Closed", "Expired"] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              filter === t ? "bg-sky-100 text-sky-700" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Chain cards */}
      <div className="px-4 pb-4 flex flex-col gap-2 mt-1">
        {visible.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">No chains for this filter</p>
        ) : (
          visible.map((chain, i) => (
            <ChainCard key={`${chain.underlying}-${chain.option_type}-${chain.start_date}-${i}`} chain={chain} />
          ))
        )}
      </div>
    </div>
  );
}
