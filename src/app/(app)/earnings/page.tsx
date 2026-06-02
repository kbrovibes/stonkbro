"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface EarningsEvent {
  symbol: string;
  name: string;
  earningsDate: string;
  daysUntil: number;
  timing: "before_market" | "after_market" | "unknown";
  category: "this_week" | "next_week" | "later";
}

function Spinner({ size = "w-5 h-5" }: { size?: string }) {
  return (
    <svg className={`${size} animate-spin text-stone-400 dark:text-text-faint`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Mini Calendar Widget
// ---------------------------------------------------------------------------

function MiniCalendar({
  earningsDates,
  selectedDate,
  onSelectDate,
}: {
  earningsDates: Map<string, number>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = today.toISOString().split("T")[0];

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = earningsDates.get(dateStr) || 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;

    cells.push(
      <button
        key={d}
        onClick={() => onSelectDate(isSelected ? null : count > 0 ? dateStr : null)}
        className={`relative flex flex-col items-center justify-center h-8 rounded-md text-[11px] transition-colors ${
          isSelected
            ? "bg-sky-600 text-white font-bold"
            : isToday
            ? "bg-stone-100 dark:bg-surface-muted text-stone-900 dark:text-text font-bold"
            : count > 0
            ? "text-stone-800 dark:text-text hover:bg-stone-50 dark:hover:bg-surface-muted cursor-pointer font-medium"
            : "text-stone-300 dark:text-text-faint"
        }`}
      >
        {d}
        {count > 0 && !isSelected && (
          <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
            isToday ? "bg-red-500" : "bg-sky-500"
          }`} />
        )}
        {count > 0 && isSelected && (
          <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white dark:bg-surface-elevated" />
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle shadow-sm px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-surface-muted text-stone-400 dark:text-text-faint"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs font-bold text-stone-800 dark:text-text">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-surface-muted text-stone-400 dark:text-text-faint"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-stone-400 dark:text-text-faint uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EarningsCalendarPage() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/earnings");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setEvents(data.earnings || []);
      } catch {
        setError("Failed to load earnings data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const earningsDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      map.set(e.earningsDate, (map.get(e.earningsDate) || 0) + 1);
    }
    return map;
  }, [events]);

  const displayEvents = selectedDate
    ? events.filter((e) => e.earningsDate === selectedDate)
    : events;

  return (
    <div className="flex flex-col flex-1 px-4 py-5 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900 dark:text-text">Earnings Calendar</h2>
        {!loading && (
          <span className="text-[10px] text-stone-400 dark:text-text-faint">{events.length} upcoming</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl bg-red-50 dark:bg-loss-bg border border-red-100 dark:border-loss-border px-4 py-3 mb-4">
          <p className="text-xs text-red-600 dark:text-loss">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-4">
            <MiniCalendar
              earningsDates={earningsDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="mt-2 text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-800"
              >
                Clear filter &mdash; show all
              </button>
            )}
          </div>

          {displayEvents.length === 0 ? (
            <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-8 text-center">
              <p className="text-sm text-stone-500 dark:text-text-subtle">
                {selectedDate ? "No earnings on this date" : "No upcoming earnings found"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_50px_60px] px-3 py-2 border-b border-stone-100 dark:border-border-subtle bg-stone-50 dark:bg-surface">
                <span className="text-[10px] font-semibold text-stone-500 dark:text-text-subtle uppercase">Ticker</span>
                <span className="text-[10px] font-semibold text-stone-500 dark:text-text-subtle uppercase">Date</span>
                <span className="text-[10px] font-semibold text-stone-500 dark:text-text-subtle uppercase text-center">When</span>
                <span className="text-[10px] font-semibold text-stone-500 dark:text-text-subtle uppercase text-right">Days</span>
              </div>

              {displayEvents.map((e) => {
                const dateObj = new Date(e.earningsDate + "T12:00:00");
                const dateShort = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const isUrgent = e.daysUntil <= 2;

                return (
                  <Link
                    key={e.symbol}
                    href={`/suggestions/${e.symbol}`}
                    className="grid grid-cols-[1fr_80px_50px_60px] items-center px-3 py-2.5 border-b border-stone-50 dark:border-border-subtle last:border-b-0 hover:bg-stone-50 dark:hover:bg-surface-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-stone-900 dark:text-text">{e.symbol}</span>
                      <span className="text-[10px] text-stone-400 dark:text-text-faint ml-1.5 truncate">{e.name}</span>
                    </div>
                    <span className="text-[11px] text-stone-600 dark:text-text-muted tabular-nums">{dateShort}</span>
                    <span className={`text-[10px] font-semibold text-center ${
                      e.timing === "before_market" ? "text-amber-600 dark:text-amber-300" : e.timing === "after_market" ? "text-violet-600 dark:text-violet-300" : "text-stone-400 dark:text-text-faint"
                    }`}>
                      {e.timing === "before_market" ? "BMO" : e.timing === "after_market" ? "AMC" : "TBD"}
                    </span>
                    <span className={`text-[11px] font-bold tabular-nums text-right ${
                      isUrgent ? "text-red-600 dark:text-loss" : e.daysUntil <= 7 ? "text-amber-600 dark:text-amber-300" : "text-stone-500 dark:text-text-subtle"
                    }`}>
                      {e.daysUntil === 0 ? "Today" : e.daysUntil === 1 ? "Tmrw" : `${e.daysUntil}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
