"use client";

import { useState } from "react";
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

type SortKey = "score" | "symbol" | "price" | "changePct" | "volumeRatio";

export default function DiscoveryTable({ stocks }: { stocks: Stock[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "symbol");
    }
  }

  const sorted = [...stocks].sort((a, b) => {
    const mult = sortAsc ? 1 : -1;
    if (sortKey === "symbol") return mult * a.symbol.localeCompare(b.symbol);
    return mult * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ▲" : " ▼") : "";

  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              {([
                ["score", "Score"],
                ["symbol", "Ticker"],
                ["price", "Price"],
                ["changePct", "Chg%"],
                ["volumeRatio", "Vol"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors hover:text-stone-700 ${
                    sortKey === key ? "text-stone-900" : "text-stone-400"
                  } ${key === "symbol" ? "text-left" : "text-right"}`}
                >
                  {label}{arrow(key)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400 text-center">
                SMA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100/80">
            {sorted.map((s) => (
              <tr
                key={s.symbol}
                className="hover:bg-stone-50 active:bg-sky-50 transition-colors"
              >
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      s.score >= 70
                        ? "bg-emerald-50 text-emerald-700"
                        : s.score >= 45
                        ? "bg-amber-50 text-amber-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {s.score}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-left">
                  <Link
                    href={`/ticker/${s.symbol}`}
                    className="text-sky-600 hover:text-sky-800 font-bold transition-colors"
                  >
                    {s.symbol}
                  </Link>
                  <div className="text-[10px] text-stone-400 truncate max-w-[120px]">
                    {s.name}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-stone-900 tabular-nums">
                  ${s.price.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-medium tabular-nums ${
                    s.changePct >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {s.changePct >= 0 ? "+" : ""}
                  {s.changePct.toFixed(2)}%
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {s.volumeRatio >= 2 ? (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      {s.volumeRatio.toFixed(1)}x
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">
                      {s.volumeRatio.toFixed(1)}x
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {s.above50sma && (
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                        50
                      </span>
                    )}
                    {s.above200sma && (
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                        200
                      </span>
                    )}
                    {!s.above50sma && !s.above200sma && (
                      <span className="text-[10px] text-stone-300">--</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
