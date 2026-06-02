"use client";

import Link from "next/link";
import { useState } from "react";
import type { IPOEntry, IPOPlatform } from "@/lib/market/ipos";
import { PLATFORM_COLORS } from "@/lib/market/ipos";

const HYPE_LABEL = ["", "Low", "Mild", "Notable", "High", "🔥 Max"];

const STATUS_TEXT: Record<string, string> = {
  filed: "text-emerald-600 dark:text-gain",
  roadshow: "text-red-600 dark:text-loss",
  priced: "text-purple-600 dark:text-purple-300",
  upcoming: "text-sky-600 dark:text-accent",
  rumored: "text-stone-400 dark:text-text-faint",
};

/** Status-colored pill backgrounds — mirrors the Earnings-pill convention. */
const STATUS_PILL: Record<string, string> = {
  filed:    "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  roadshow: "bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong",
  priced:   "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
  upcoming: "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
  rumored:  "bg-stone-50 dark:bg-surface text-stone-500 dark:text-text-subtle",
};

/** Try to render the expectedDate as a short days-until token; fall back
 *  to the raw string when it isn't a parseable calendar date. */
function shortWhen(expectedDate: string): string {
  const parsed = Date.parse(expectedDate);
  if (Number.isNaN(parsed)) return expectedDate;
  const todayMs = new Date(new Date().toDateString()).getTime();
  const days = Math.round((parsed - todayMs) / 86400_000);
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days === 1) return "tmrw";
  if (days <= 31) return `${days}d`;
  const d = new Date(parsed);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export type EarningsPill = {
  symbol: string;
  earningsDate: string;
  daysUntil: number;
  timing: string;
  category: string;
};

interface Props {
  earnings: EarningsPill[];
  ipos: IPOEntry[];
}

export default function UpcomingCatalysts({ earnings, ipos }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedIPO = ipos.find((i) => i.name === selected);

  if (earnings.length === 0 && ipos.length === 0) return null;

  return (
    <div>
      {/* Header row: title left, stacked calendar links right */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-stone-800 dark:text-text">Upcoming Catalysts</span>
        <div className="flex flex-col items-end gap-0.5">
          <Link
            href="/earnings"
            className="text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-700"
          >
            Full Calendar
          </Link>
          <a
            href="https://www.nasdaq.com/market-activity/ipos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-700"
          >
            IPO Calendar ↗
          </a>
        </div>
      </div>

      {/* Combined pills — earnings first, then IPOs */}
      <div className="flex flex-wrap gap-1.5">
        {earnings.map((e) => (
          <Link
            key={`er-${e.symbol}`}
            href={`/suggestions/${e.symbol}`}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors hover:opacity-80 ${
              e.category === "this_week"
                ? "bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            <span className="font-bold">{e.symbol}</span>
            <span className="opacity-70">
              {e.daysUntil === 0 ? "today" : e.daysUntil === 1 ? "tmrw" : `${e.daysUntil}d`}
            </span>
          </Link>
        ))}

        {ipos.map((ipo) => {
          const isSelected = selected === ipo.name;
          const pillBg = STATUS_PILL[ipo.status] ?? STATUS_PILL.rumored;
          const ring = isSelected ? "ring-2 ring-stone-900 ring-offset-1" : "";
          return (
            <button
              key={`ipo-${ipo.name}`}
              onClick={() => setSelected(isSelected ? null : ipo.name)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors hover:opacity-80 ${pillBg} ${ring}`}
            >
              <span className="font-bold">{ipo.ticker ?? ipo.name}</span>
              <span className="opacity-70">{shortWhen(ipo.expectedDate)}</span>
              {ipo.hype >= 4 && (
                <span className="text-amber-500 font-semibold ml-0.5">
                  {HYPE_LABEL[ipo.hype]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded detail card for a selected IPO */}
      {selectedIPO && (
        <div className="mt-2 bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-900 dark:text-text text-sm">{selectedIPO.name}</span>
                {selectedIPO.ticker && (
                  <span className="font-mono text-stone-400 dark:text-text-faint text-[10px]">{selectedIPO.ticker}</span>
                )}
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_TEXT[selectedIPO.status] ?? ""} bg-stone-100 dark:bg-surface-muted`}>
                  {selectedIPO.status}
                </span>
                {selectedIPO.isLive && (
                  <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-gain">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    live
                  </span>
                )}
              </div>
              <p className="text-stone-500 dark:text-text-subtle mt-1 leading-relaxed">{selectedIPO.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
              <div className="text-[9px] text-stone-400 dark:text-text-faint mb-0.5">Expected</div>
              <div className="font-semibold text-stone-800 dark:text-text text-[10px]">{selectedIPO.expectedDate}</div>
            </div>
            <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
              <div className="text-[9px] text-stone-400 dark:text-text-faint mb-0.5">Valuation</div>
              <div className="font-semibold text-stone-800 dark:text-text text-[10px]">{selectedIPO.priceRange ?? selectedIPO.valuation ?? "—"}</div>
            </div>
            <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
              <div className="text-[9px] text-stone-400 dark:text-text-faint mb-0.5">Hype</div>
              <div className="font-semibold text-stone-800 dark:text-text text-[10px]">{HYPE_LABEL[selectedIPO.hype]}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle text-[9px] font-medium px-1.5 py-0.5 rounded">
              {selectedIPO.sector}
            </span>
            {selectedIPO.platforms.length > 0 && (
              <>
                <span className="text-[9px] text-stone-400 dark:text-text-faint">Pre-IPO access:</span>
                {selectedIPO.platforms.map((p) => (
                  <span
                    key={p}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${PLATFORM_COLORS[p as IPOPlatform]}`}
                  >
                    {p}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
