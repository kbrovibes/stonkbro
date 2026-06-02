"use client";

import Link from "next/link";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  volumeRatio: number;
  above50sma: boolean;
  above200sma: boolean;
  score: number;
}

export default function DiscoveryTable({ stocks }: { stocks: Stock[] }) {
  const sorted = [...stocks].sort((a, b) => b.score - a.score);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {sorted.map((s) => (
        <Link
          key={s.symbol}
          href={`/ticker/${s.symbol}`}
          className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-stone-100 dark:border-border-subtle p-3 flex flex-col items-center gap-1 text-center hover:border-stone-300 active:bg-sky-50 dark:active:bg-accent-bg transition-colors"
        >
          {/* Score badge */}
          <span
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${
              s.score >= 70
                ? "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong"
                : s.score >= 45
                ? "bg-amber-50 text-amber-700"
                : "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle"
            }`}
          >
            {s.score}
          </span>

          {/* Symbol */}
          <span className="text-sm font-bold text-stone-900 dark:text-text">{s.symbol}</span>

          {/* Price + change */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-stone-700 dark:text-text-muted tabular-nums">
              ${s.price.toFixed(2)}
            </span>
            <span
              className={`text-xs font-semibold tabular-nums ${
                s.changePct >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"
              }`}
            >
              {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%
            </span>
          </div>

          {/* Volume + SMA indicators */}
          <div className="flex items-center gap-1 flex-wrap justify-center mt-0.5">
            {s.volumeRatio >= 2 && (
              <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                {s.volumeRatio.toFixed(1)}x vol
              </span>
            )}
            {s.above50sma && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-gain bg-emerald-50 dark:bg-gain-bg px-1 py-0.5 rounded">
                50
              </span>
            )}
            {s.above200sma && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-gain bg-emerald-50 dark:bg-gain-bg px-1 py-0.5 rounded">
                200
              </span>
            )}
          </div>

          {/* Name */}
          <span className="text-[10px] text-stone-400 dark:text-text-faint truncate max-w-full leading-tight">
            {s.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
