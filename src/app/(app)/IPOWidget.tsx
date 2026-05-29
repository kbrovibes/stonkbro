"use client";

import { useState } from "react";
import type { IPOEntry, IPOPlatform } from "@/lib/market/ipos";
import { PLATFORM_COLORS } from "@/lib/market/ipos";

const HYPE_LABEL = ["", "Low", "Mild", "Notable", "High", "🔥 Max"];

const STATUS_DOT: Record<string, string> = {
  filed: "bg-emerald-400",
  roadshow: "bg-red-400",
  priced: "bg-purple-400",
  upcoming: "bg-sky-400",
  rumored: "bg-stone-300",
};

const STATUS_LABEL: Record<string, string> = {
  filed: "Filed",
  roadshow: "Roadshow",
  priced: "Priced",
  upcoming: "Upcoming",
  rumored: "Rumored",
};

const STATUS_TEXT: Record<string, string> = {
  filed: "text-emerald-600",
  roadshow: "text-red-600",
  priced: "text-purple-600",
  upcoming: "text-sky-600",
  rumored: "text-stone-400",
};

/** Status-colored pill backgrounds — mirrors the Earnings-pill convention. */
const STATUS_PILL: Record<string, string> = {
  filed:    "bg-emerald-50 text-emerald-700",
  roadshow: "bg-red-50 text-red-700",
  priced:   "bg-purple-50 text-purple-700",
  upcoming: "bg-sky-50 text-sky-700",
  rumored:  "bg-stone-50 text-stone-500",
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
  // Far out — show "Mon 'YY"
  const d = new Date(parsed);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface IPOWidgetProps {
  ipos: IPOEntry[];
  defaultExpanded: boolean;
}

export default function IPOWidget({ ipos, defaultExpanded }: IPOWidgetProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedIPO = ipos.find((i) => i.name === selected);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-800 hover:text-stone-600 transition-colors"
        >
          <span>Upcoming Tech IPOs</span>
          <span className="text-[10px] font-normal text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
            {ipos.length}
          </span>
          <svg
            className={`w-3 h-3 text-stone-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <a
          href="https://www.nasdaq.com/market-activity/ipos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-medium text-sky-600 hover:text-sky-700"
        >
          IPO Calendar ↗
        </a>
      </div>

      {expanded && (
        <>
          {/* Pills — mirrors the Earnings widget chip style */}
          <div className="flex flex-wrap gap-1.5">
            {ipos.map((ipo) => {
              const isSelected = selected === ipo.name;
              const pillBg = STATUS_PILL[ipo.status] ?? STATUS_PILL.rumored;
              const ring = isSelected ? "ring-2 ring-stone-900 ring-offset-1" : "";
              return (
                <button
                  key={ipo.name}
                  onClick={() => setSelected(isSelected ? null : ipo.name)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors hover:opacity-80 ${pillBg} ${ring}`}
                >
                  <span className="font-bold">{ipo.ticker ?? ipo.name}</span>
                  <span className="opacity-70">{shortWhen(ipo.expectedDate)}</span>
                  {ipo.hype >= 4 && (
                    <span className="text-amber-500 font-semibold ml-0.5">{HYPE_LABEL[ipo.hype]}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expanded detail card */}
          {selectedIPO && (
            <div className="mt-2 bg-white border border-stone-200 rounded-xl p-3 text-xs space-y-2">
              {/* Name row */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900 text-sm">{selectedIPO.name}</span>
                    {selectedIPO.ticker && (
                      <span className="font-mono text-stone-400 text-[10px]">{selectedIPO.ticker}</span>
                    )}
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_TEXT[selectedIPO.status] ?? ""} bg-stone-100`}>
                      {selectedIPO.status}
                    </span>
                    {selectedIPO.isLive && (
                      <span className="flex items-center gap-0.5 text-[9px] text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        live
                      </span>
                    )}
                  </div>
                  <p className="text-stone-500 mt-1 leading-relaxed">{selectedIPO.description}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-50 rounded-lg p-2">
                  <div className="text-[9px] text-stone-400 mb-0.5">Expected</div>
                  <div className="font-semibold text-stone-800 text-[10px]">{selectedIPO.expectedDate}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-2">
                  <div className="text-[9px] text-stone-400 mb-0.5">Valuation</div>
                  <div className="font-semibold text-stone-800 text-[10px]">{selectedIPO.priceRange ?? selectedIPO.valuation ?? "—"}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-2">
                  <div className="text-[9px] text-stone-400 mb-0.5">Hype</div>
                  <div className="font-semibold text-stone-800 text-[10px]">{HYPE_LABEL[selectedIPO.hype]}</div>
                </div>
              </div>

              {/* Sector + platforms */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-stone-100 text-stone-500 text-[9px] font-medium px-1.5 py-0.5 rounded">
                  {selectedIPO.sector}
                </span>
                {selectedIPO.platforms.length > 0 && (
                  <>
                    <span className="text-[9px] text-stone-400">Pre-IPO access:</span>
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
        </>
      )}
    </div>
  );
}
