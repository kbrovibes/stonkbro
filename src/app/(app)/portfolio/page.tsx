"use client";

import { useState, useEffect } from "react";
import type { OptionChain, OptionLeg } from "@/lib/snaptrade/client";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtMonth(m: string) {
  const [year, month] = m.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

type FilterTab = "Closed" | "Open" | "Assigned" | "Monthly";

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

// Detect roll: leg at index i opens after a close on same or adjacent day
function isRoll(legs: OptionLeg[], i: number): boolean {
  if (i === 0) return false;
  const prev = legs[i - 1];
  const curr = legs[i];
  if (curr.type !== "SELL" && curr.type !== "BUY") return false;
  const diff = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / 86400000;
  return diff <= 1 && curr.strike !== prev.strike && curr.type !== prev.type;
}

function ChainCard({ chain }: { chain: OptionChain }) {
  const [expanded, setExpanded] = useState(false);

  const dateRange = chain.end_date
    ? `${fmtDate(chain.start_date)} → ${fmtDate(chain.end_date)}`
    : `${fmtDate(chain.start_date)} → now`;

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
        </div>
      )}
    </div>
  );
}

function MonthlyView({ chains }: { chains: OptionChain[] }) {
  // Only realized (closed/expired/assigned) chains contribute to monthly returns
  const realized = chains.filter(c => c.close_month && c.status !== "OPEN");

  const byMonth = new Map<string, { pnl: number; chains: OptionChain[] }>();
  for (const c of realized) {
    const m = c.close_month!;
    if (!byMonth.has(m)) byMonth.set(m, { pnl: 0, chains: [] });
    byMonth.get(m)!.pnl += c.net_pnl;
    byMonth.get(m)!.chains.push(c);
  }

  const months = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPnl = months.reduce((s, [, v]) => s + v.pnl, 0);

  if (months.length === 0) {
    return <p className="text-sm text-stone-400 text-center py-8">No closed positions in this period</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Period total */}
      <div className="bg-white border border-stone-100 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">90-Day Total</span>
        <span className={`font-bold text-lg ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {totalPnl >= 0 ? "+" : ""}{fmtCurrency(totalPnl)}
        </span>
      </div>

      {months.map(([month, { pnl, chains: mChains }]) => {
        const winners = mChains.filter(c => c.net_pnl > 0).length;
        const losers = mChains.filter(c => c.net_pnl <= 0).length;
        const byUnderlying = mChains.reduce<Record<string, number>>((acc, c) => {
          const k = `${c.underlying} ${c.option_type}`;
          acc[k] = (acc[k] ?? 0) + c.net_pnl;
          return acc;
        }, {});

        return (
          <div key={month} className="bg-white border border-stone-100 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold text-sm text-stone-900">{fmtMonth(month)}</div>
                <div className="text-xs text-stone-400">{mChains.length} chains · {winners}W / {losers}L</div>
              </div>
              <span className={`font-bold text-base ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {pnl >= 0 ? "+" : ""}{fmtCurrency(pnl)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 mt-2 pt-2 border-t border-stone-50">
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
          </div>
        );
      })}
    </div>
  );
}

export default function PortfolioPage() {
  const [chains, setChains] = useState<OptionChain[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("Closed");

  useEffect(() => {
    fetch("/api/portfolio?include=option-chains")
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
  const closed   = chains.filter(c => c.status === "CLOSED" || c.status === "EXPIRED");
  const assigned = chains.filter(c => c.status === "ASSIGNED");
  const closedPnl = closed.reduce((s, c) => s + c.net_pnl, 0);

  const TABS: FilterTab[] = ["Closed", "Open", "Assigned", "Monthly"];

  const filtered =
    filter === "Closed"   ? closed :
    filter === "Open"     ? open :
    filter === "Assigned" ? assigned : [];

  return (
    <div className="flex flex-col">
      {/* Summary */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white border border-stone-100 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1">90-Day Realized</div>
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
