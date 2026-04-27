"use client";

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
  return (
    <div className="flex flex-col gap-3">
      {watchlists.map((wl) => {
        const avgReturn = groupReturn(wl.tickers);
        return (
          <div key={wl.id} className="rounded-xl bg-white shadow-sm border border-stone-100 px-4 py-3">
            {/* Card header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">{wl.name}</h3>
                {avgReturn !== null && (
                  <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                    avgReturn >= 0
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-red-600 bg-red-50"
                  }`}>
                    {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(1)}%
                  </span>
                )}
              </div>
              <Link
                href={`/watchlists/${wl.id}`}
                className="text-[10px] font-semibold text-sky-600 hover:text-sky-700"
              >
                Edit
              </Link>
            </div>

            {/* Ticker chips */}
            {wl.tickers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {wl.tickers.map((t) => {
                  const up = t.changePct >= 0;
                  return (
                    <Link
                      key={t.symbol}
                      href={`/ticker/${t.symbol}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${
                        up
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      <span className="font-bold">{t.symbol}</span>
                      <span className="text-[10px] opacity-70 tabular-nums">
                        ${t.price < 1000 ? t.price.toFixed(2) : t.price.toFixed(0)}
                      </span>
                      <span className={`text-[10px] font-bold tabular-nums ${
                        up ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {up ? "+" : ""}{t.changePct.toFixed(1)}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Link href={`/watchlists/${wl.id}`} className="text-[11px] text-sky-600 font-medium hover:text-sky-800">
                + Add tickers
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
