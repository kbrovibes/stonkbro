"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EarningsEvent {
  symbol: string;
  name: string;
  earningsDate: string;
  daysUntil: number;
  timing: "before_market" | "after_market" | "unknown";
  category: "this_week" | "next_week" | "later";
}

interface PositionStub {
  symbol: string;
}

const TIMING_LABELS: Record<string, string> = {
  before_market: "BMO",
  after_market: "AMC",
  unknown: "TBD",
};

const CATEGORY_META: Record<
  string,
  { label: string; cardBg: string; cardBorder: string; accent: string; badgeBg: string; badgeText: string }
> = {
  this_week: {
    label: "This Week",
    cardBg: "bg-red-50",
    cardBorder: "border-red-200",
    accent: "text-red-600",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
  },
  next_week: {
    label: "Next Week",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-200",
    accent: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  later: {
    label: "Later",
    cardBg: "bg-stone-50",
    cardBorder: "border-stone-200",
    accent: "text-stone-500",
    badgeBg: "bg-stone-100",
    badgeText: "text-stone-600",
  },
};

function Spinner({ size = "w-5 h-5" }: { size?: string }) {
  return (
    <svg className={`${size} animate-spin text-stone-400`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatEarningsDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EarningsCalendarPage() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionSymbols, setPositionSymbols] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [earningsRes, positionsRes] = await Promise.allSettled([
          fetch("/api/earnings"),
          fetch("/api/signals"), // reuse signals to get position symbols
        ]);

        if (earningsRes.status === "fulfilled" && earningsRes.value.ok) {
          const data = await earningsRes.value.json();
          setEvents(data.earnings || []);
        } else {
          setError("Failed to load earnings data");
        }

        // Try to extract position symbols from signals endpoint or positions
        if (positionsRes.status === "fulfilled" && positionsRes.value.ok) {
          const data = await positionsRes.value.json();
          const syms = new Set<string>();
          // alerts contain symbol field
          for (const a of data.alerts || []) {
            if (a.symbol) syms.add(a.symbol);
          }
          // Also check positions if present
          for (const p of data.positions || []) {
            if (p.symbol) syms.add(p.symbol);
          }
          setPositionSymbols(syms);
        }
      } catch {
        setError("Failed to load earnings data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const grouped = {
    this_week: events.filter((e) => e.category === "this_week"),
    next_week: events.filter((e) => e.category === "next_week"),
    later: events.filter((e) => e.category === "later"),
  };

  const totalUpcoming = events.length;

  return (
    <div className="flex flex-col flex-1 px-4 py-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Earnings Calendar</h2>
          {!loading && (
            <p className="text-[11px] text-stone-400 mt-0.5">
              {totalUpcoming} upcoming earnings tracked
            </p>
          )}
        </div>
        <Link
          href="/today"
          className="text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors"
        >
          Back to Today
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && events.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-10 text-center">
          <p className="text-sm text-stone-500">No upcoming earnings found</p>
        </div>
      )}

      {/* Calendar sections */}
      {!loading &&
        !error &&
        (["this_week", "next_week", "later"] as const).map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          const meta = CATEGORY_META[cat];

          return (
            <section key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-stone-800">{meta.label}</h3>
                <span
                  className={`text-[10px] font-semibold ${meta.badgeText} ${meta.badgeBg} px-1.5 py-0.5 rounded-full`}
                >
                  {items.length} {items.length === 1 ? "stock" : "stocks"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.map((event) => {
                  const hasPosition = positionSymbols.has(event.symbol);

                  return (
                    <div
                      key={event.symbol}
                      className={`rounded-xl border ${meta.cardBorder} ${meta.cardBg} px-4 py-3`}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/ticker/${event.symbol}`}
                            className="text-sm font-bold text-stone-900 hover:text-sky-600 transition-colors"
                          >
                            {event.symbol}
                          </Link>
                          <span
                            className={`text-[10px] font-semibold ${meta.badgeText} ${meta.badgeBg} px-1.5 py-0.5 rounded-full`}
                          >
                            {TIMING_LABELS[event.timing]}
                          </span>
                          {hasPosition && (
                            <span className="text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">
                              Open position
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-semibold tabular-nums ${meta.accent}`}>
                          {event.daysUntil === 0
                            ? "Today"
                            : event.daysUntil === 1
                              ? "Tomorrow"
                              : `${event.daysUntil}d`}
                        </span>
                      </div>

                      {/* Name + date */}
                      <p className="text-xs text-stone-500 mb-2">
                        {event.name} &middot; {formatEarningsDate(event.earningsDate)}
                      </p>

                      {/* Action row */}
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/suggestions/${event.symbol}`}
                          className="inline-flex items-center rounded-lg bg-stone-800 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-stone-700 transition-colors"
                        >
                          Sell Put
                        </Link>
                        <Link
                          href={`/ticker/${event.symbol}`}
                          className="text-xs font-medium text-sky-600 hover:text-sky-800 transition-colors"
                        >
                          View Options &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
}
