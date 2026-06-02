"use client";

import { useState } from "react";
import Link from "next/link";
import { SECTORS } from "@/lib/market/sectors";

const colorMap: Record<string, { accent: string; badge: string; dot: string }> = {
  violet: { accent: "text-violet-600 dark:text-violet-300", badge: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300", dot: "bg-violet-500" },
  sky: { accent: "text-sky-600 dark:text-accent", badge: "bg-sky-50 dark:bg-accent-bg text-sky-600 dark:text-accent", dot: "bg-sky-500" },
  indigo: { accent: "text-indigo-600 dark:text-indigo-300", badge: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300", dot: "bg-indigo-500" },
  emerald: { accent: "text-emerald-600 dark:text-gain", badge: "bg-emerald-50 dark:bg-gain-bg text-emerald-600 dark:text-gain", dot: "bg-emerald-500" },
  amber: { accent: "text-amber-600 dark:text-amber-300", badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300", dot: "bg-amber-500" },
  rose: { accent: "text-rose-600 dark:text-loss", badge: "bg-rose-50 dark:bg-loss-bg text-rose-600 dark:text-loss", dot: "bg-rose-500" },
  lime: { accent: "text-lime-600 dark:text-lime-300", badge: "bg-lime-50 dark:bg-lime-950/40 text-lime-600 dark:text-lime-300", dot: "bg-lime-500" },
};

export default function SectorsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-4">
      <div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-text">Sector Discovery</h2>
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
          Find explosive stocks by sector theme
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {SECTORS.map((sector) => {
          const colors = colorMap[sector.color] ?? colorMap.violet;
          const isExpanded = expanded === sector.slug;

          return (
            <div
              key={sector.slug}
              className={`rounded-xl bg-white dark:bg-surface-elevated shadow-sm overflow-hidden transition-all ${
                isExpanded ? "col-span-2" : ""
              }`}
            >
              {/* Card face */}
              <button
                onClick={() => setExpanded(isExpanded ? null : sector.slug)}
                className="w-full text-left px-3 py-3 hover:bg-stone-50 dark:hover:bg-surface-muted active:bg-sky-50 dark:active:bg-accent-bg transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                  <h3 className={`text-xs font-bold ${colors.accent} leading-tight`}>
                    {sector.name}
                  </h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 dark:text-text-faint font-medium">
                    {sector.tickers.length} tickers
                  </span>
                  <svg
                    className={`w-3 h-3 text-stone-300 dark:text-text-faint transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-stone-100/80">
                  <p className="text-[11px] text-stone-500 dark:text-text-subtle leading-relaxed mt-2 mb-2.5">
                    {sector.description}
                  </p>

                  {/* Catalyst badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {sector.catalysts.map((c) => (
                      <span
                        key={c}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge}`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Ticker badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {sector.tickers.map((t) => (
                      <Link
                        key={t}
                        href={`/ticker/${t}`}
                        className="text-[10px] font-bold text-sky-600 dark:text-accent hover:text-sky-800 bg-stone-50 dark:bg-surface hover:bg-stone-100 dark:hover:bg-surface-muted px-2 py-1 rounded-lg transition-colors"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>

                  {/* Explore link */}
                  <Link
                    href={`/sectors/${sector.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
                  >
                    Explore sector
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
