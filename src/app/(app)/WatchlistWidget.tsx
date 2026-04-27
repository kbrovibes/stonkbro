"use client";

import { useState } from "react";
import Link from "next/link";

interface Ticker {
  symbol: string;
  price: number;
  changePct: number;
}

interface Watchlist {
  id: string;
  name: string;
  tickers: Ticker[];
}

function groupReturn(tickers: Ticker[]): number | null {
  if (tickers.length === 0) return null;
  return tickers.reduce((sum, t) => sum + t.changePct, 0) / tickers.length;
}

export default function WatchlistWidget({ watchlists }: { watchlists: Watchlist[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex flex-col gap-3">
      {watchlists.map((wl) => {
        const isCollapsed = collapsed[wl.id] ?? false;
        const avgReturn = groupReturn(wl.tickers);

        return (
          <div key={wl.id} className="rounded-xl bg-white shadow-sm border border-stone-100 overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggle(wl.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-50 active:bg-sky-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-xs font-bold text-stone-800">{wl.name}</span>
                <span className="text-[10px] text-stone-400">{wl.tickers.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {avgReturn !== null && (
                  <span className={`text-[11px] font-bold tabular-nums ${
                    avgReturn >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(1)}%
                  </span>
                )}
                <Link
                  href={`/watchlists/${wl.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-medium text-sky-600 hover:text-sky-800 px-1.5 py-0.5 rounded hover:bg-sky-50 transition-colors"
                >
                  Edit
                </Link>
              </div>
            </button>

            {/* Compact 2-column ticker grid */}
            {!isCollapsed && wl.tickers.length > 0 && (
              <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-1.5">
                {wl.tickers.map((t) => (
                  <Link
                    key={t.symbol}
                    href={`/ticker/${t.symbol}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-sky-50 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-sky-600">{t.symbol}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-500 tabular-nums">
                        ${t.price < 1000 ? t.price.toFixed(2) : t.price.toFixed(0)}
                      </span>
                      <span className={`text-[10px] font-semibold tabular-nums min-w-[36px] text-right ${
                        t.changePct >= 0 ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(1)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!isCollapsed && wl.tickers.length === 0 && (
              <div className="px-3 pb-2.5 flex items-center justify-between">
                <span className="text-[10px] text-stone-400">No tickers yet</span>
                <Link
                  href={`/watchlists/${wl.id}`}
                  className="text-[10px] font-medium text-sky-600 hover:text-sky-800"
                >
                  Add tickers &rarr;
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
