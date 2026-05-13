"use client";

import { useState, useEffect } from "react";
import type { PortfolioData } from "@/lib/snaptrade/client";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function fmtSmall(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"positions" | "balances">("positions");

  useEffect(() => {
    fetch("/api/portfolio")
      .then(async (r) => {
        if (r.status === 403) throw new Error("Access restricted");
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail ? `${r.status}: ${body.detail}` : `Failed to load portfolio (${r.status})`);
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-28 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-8 bg-stone-100 rounded-lg animate-pulse w-40" />
        {[...Array(6)].map((_, i) => (
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

  if (!data) return null;

  const { summary, positions, balances } = data;

  return (
    <div className="flex flex-col">
      {/* Summary card */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-stone-900 text-white rounded-2xl p-5">
          <div className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1">Portfolio Value</div>
          <div className="text-3xl font-bold tracking-tight mb-1">
            {fmt(summary.total_market_value + summary.cash)}
          </div>
          <div className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
            summary.unrealized_pnl >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          }`}>
            <span>{summary.unrealized_pnl >= 0 ? "▲" : "▼"}</span>
            <span>{fmtSmall(Math.abs(summary.unrealized_pnl))}</span>
            <span>({fmtPct(summary.unrealized_pnl_pct)})</span>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-stone-700">
            <div>
              <div className="text-xs text-stone-500">Invested</div>
              <div className="text-sm font-semibold">{fmt(summary.total_cost_basis)}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Cash</div>
              <div className="text-sm font-semibold">{fmt(summary.cash)}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Positions</div>
              <div className="text-sm font-semibold">{summary.total_positions}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts */}
      {data.accounts.length > 0 && (
        <div className="px-4 pt-2 pb-1 flex gap-2 flex-wrap">
          {data.accounts.map((a) => (
            <span key={a.id} className="text-xs bg-stone-100 text-stone-600 rounded-full px-2.5 py-1 font-medium">
              {a.institution} · {a.number}
            </span>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="px-4 pt-3 pb-1 flex gap-1">
        {(["positions", "balances"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg capitalize transition-colors ${
              tab === t ? "bg-sky-100 text-sky-700" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Positions */}
      {tab === "positions" && (
        <div className="px-4 pb-4 flex flex-col gap-2 mt-1">
          {positions.map((p, i) => (
            <div key={`${p.symbol}-${i}`} className="bg-white border border-stone-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-stone-900">{p.symbol}</span>
                  {p.is_option && (
                    <span className="text-xs bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-medium">OPT</span>
                  )}
                </div>
                <div className="text-xs text-stone-400 truncate mt-0.5">
                  {Number.isInteger(p.units) ? p.units : p.units.toFixed(4)} sh · {fmtSmall(p.price)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-sm text-stone-900">{fmt(p.market_value)}</div>
                <div className={`text-xs font-medium ${p.unrealized_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {p.unrealized_pnl >= 0 ? "+" : ""}{fmtSmall(p.unrealized_pnl)} ({fmtPct(p.unrealized_pnl_pct)})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Balances */}
      {tab === "balances" && (
        <div className="px-4 pb-4 flex flex-col gap-2 mt-1">
          {balances.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No balance data available</p>
          ) : balances.map((b, i) => (
            <div key={i} className="bg-white border border-stone-100 rounded-xl px-4 py-3">
              <div className="text-xs text-stone-400 mb-2">{b.account_name} · {b.currency}</div>
              <div className="flex gap-6">
                <div>
                  <div className="text-xs text-stone-500">Cash</div>
                  <div className="font-semibold text-sm">{fmtSmall(b.cash)}</div>
                </div>
                <div>
                  <div className="text-xs text-stone-500">Buying Power</div>
                  <div className="font-semibold text-sm">{fmtSmall(b.buying_power)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-2 text-center">
        <p className="text-xs text-stone-300">
          Live via SnapTrade · {new Date(data.fetched_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
