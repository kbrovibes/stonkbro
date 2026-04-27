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
          <div key={wl.id} className="rounded-xl bg-white shadow-sm border border-stone-100 px-3 py-2.5">
            {/* Card header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-800">{wl.name}</span>
                <span className="text-[10px] text-stone-400">{wl.tickers.length}</span>
                {avgReturn !== null && (
                  <span className={`text-[10px] font-bold tabular-nums ${
                    avgReturn >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(1)}%
                  </span>
                )}
              </div>
              <Link
                href={`/watchlists/${wl.id}`}
                className="text-[10px] font-medium text-sky-600 hover:text-sky-700"
              >
                Edit
              </Link>
            </div>

            {/* Ticker chips */}
            {wl.tickers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {wl.tickers.map((t) => {
                  const up = t.changePct >= 0;
                  return (
                    <Link
                      key={t.symbol}
                      href={`/ticker/${t.symbol}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors hover:opacity-80 ${
                        up
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-red-200 bg-red-50/70"
                      }`}
                    >
                      <span className="font-bold text-stone-800">{t.symbol}</span>
                      <span className={`text-[10px] font-semibold tabular-nums ${
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
