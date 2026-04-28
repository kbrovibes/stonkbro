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
    <div className="flex flex-col gap-4">
      {watchlists.map((wl) => {
        const avgReturn = groupReturn(wl.tickers);
        return (
          <div key={wl.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-800">{wl.name}</span>
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

            {wl.tickers.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {wl.tickers.map((t) => {
                  const up = t.changePct >= 0;
                  return (
                    <Link
                      key={t.symbol}
                      href={`/ticker/${t.symbol}`}
                      className={`rounded-lg p-2 transition-all hover:scale-[1.02] active:scale-95 ${
                        up ? "bg-emerald-50 hover:bg-emerald-100/80" : "bg-red-50 hover:bg-red-100/80"
                      }`}
                    >
                      <div className="text-[11px] font-extrabold text-stone-900 leading-none">{t.symbol}</div>
                      <div className={`text-[10px] font-bold tabular-nums leading-none mt-1 ${
                        up ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {up ? "+" : ""}{t.changePct.toFixed(1)}%
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-stone-200 px-4 py-3 text-center">
                <Link href={`/watchlists/${wl.id}`} className="text-[11px] text-sky-600 font-medium hover:text-sky-800">
                  + Add tickers
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
