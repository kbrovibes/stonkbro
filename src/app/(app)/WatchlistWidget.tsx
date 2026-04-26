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

export default function WatchlistWidget({ watchlists }: { watchlists: Watchlist[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex flex-col gap-2">
      {watchlists.map((wl) => {
        const isCollapsed = collapsed[wl.id] ?? false;
        return (
          <div key={wl.id} className="rounded-xl bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(wl.id)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-stone-50 active:bg-sky-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-xs font-semibold text-stone-700">{wl.name}</span>
                <span className="text-[10px] text-stone-400">{wl.tickers.length}</span>
              </div>
            </button>

            {!isCollapsed && wl.tickers.length > 0 && (
              <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                {wl.tickers.map((t) => (
                  <Link
                    key={t.symbol}
                    href={`/ticker/${t.symbol}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-sky-50 transition-colors group"
                  >
                    <span className="text-xs font-bold text-sky-600 group-hover:text-sky-800">{t.symbol}</span>
                    <span className="text-[10px] font-medium text-stone-500 tabular-nums">
                      ${t.price.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-semibold tabular-nums ${
                      t.changePct >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {!isCollapsed && wl.tickers.length === 0 && (
              <div className="px-3 pb-2.5">
                <span className="text-[10px] text-stone-400">No tickers yet</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
