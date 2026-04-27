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

function TickerCard({ t }: { t: Ticker }) {
  const up = t.changePct >= 0;
  return (
    <Link
      href={`/ticker/${t.symbol}`}
      className={`flex flex-col items-center rounded-xl px-1 py-2.5 border transition-colors ${
        up
          ? "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50"
          : "bg-red-50/60 border-red-100 hover:bg-red-50"
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black mb-1.5 ${
        up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
      }`}>
        {t.symbol.slice(0, 2)}
      </div>
      <span className="text-[11px] font-bold text-stone-900 leading-none">{t.symbol}</span>
      <span className="text-[10px] text-stone-500 tabular-nums mt-0.5">
        ${t.price < 1000 ? t.price.toFixed(2) : t.price.toFixed(0)}
      </span>
      <span className={`text-[10px] font-bold tabular-nums mt-0.5 ${
        up ? "text-emerald-600" : "text-red-500"
      }`}>
        {up ? "+" : ""}{t.changePct.toFixed(1)}%
      </span>
    </Link>
  );
}

export default function WatchlistWidget({ watchlists }: { watchlists: Watchlist[] }) {
  return (
    <div className="flex flex-col gap-4">
      {watchlists.map((wl) => {
        const avgReturn = groupReturn(wl.tickers);
        return (
          <div key={wl.id}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-800">{wl.name}</span>
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
                className="text-[10px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
              >
                Edit
              </Link>
            </div>

            {/* 3-col ticker card grid */}
            {wl.tickers.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {wl.tickers.map((t) => (
                  <TickerCard key={t.symbol} t={t} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-200 px-4 py-4 text-center">
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
