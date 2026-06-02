"use client";

import Link from "next/link";
import { useState } from "react";

type Filter = "all" | "active" | "closed";

function strategyBadgeClass(strategy: string) {
  const map: Record<string, string> = {
    PMCC: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    "Covered Call": "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
    "Cash-Secured Put": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    "The Wheel": "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  };
  return map[strategy] ?? "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted";
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted" },
    closed: { label: "Closed", cls: "bg-stone-200 dark:bg-surface-sunken text-stone-500 dark:text-text-subtle" },
    rolled: { label: "Rolled", cls: "bg-sky-50 dark:bg-accent-bg text-sky-600 dark:text-accent" },
  };
  const { label, cls } = map[status] ?? map.active;
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}
    >
      {label}
    </span>
  );
}

function legLabel(type: string) {
  const map: Record<string, string> = {
    leaps_call: "LEAPS Call",
    short_call: "Short Call",
    short_put: "Short Put",
    shares: "Shares",
    long_put: "Long Put",
  };
  return map[type] ?? type;
}

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PositionFilters({ positions }: { positions: any[]; children?: React.ReactNode }) {
  const [filter, setFilter] = useState<Filter>("all");

  if (positions.length === 0) return null;

  const filtered = positions.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") return p.status === "active";
    if (filter === "closed") return p.status === "closed" || p.status === "rolled";
    return true;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-stone-100 dark:bg-surface-muted rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              filter === tab.key
                ? "bg-white dark:bg-surface-elevated text-stone-900 dark:text-text shadow-sm"
                : "text-stone-500 dark:text-text-subtle hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Position Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((pos) => {
          const legs = pos.position_legs ?? [];
          const days = pos.entry_date
            ? daysSince(pos.entry_date)
            : pos.created_at
              ? daysSince(pos.created_at)
              : 0;

          return (
            <Link
              key={pos.id}
              href={`/positions/${pos.id}`}
              className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4 hover:border-stone-300 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-text">
                    {pos.symbol}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${strategyBadgeClass(pos.strategy)}`}
                  >
                    {pos.strategy}
                  </span>
                </div>
                {statusBadge(pos.status ?? "active")}
              </div>

              {/* Legs summary */}
              <div className="flex flex-col gap-1 mb-3">
                {legs.map((leg: { id: string; type: string; strike: number; expiry: string; entry_price: number }) => (
                  <div
                    key={leg.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-stone-500 dark:text-text-subtle">
                      {legLabel(leg.type)} ${leg.strike} exp{" "}
                      {new Date(leg.expiry).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </span>
                    <span className="font-medium text-stone-600 dark:text-text-muted">
                      ${Math.abs(leg.entry_price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-border-subtle">
                <span className="text-[10px] text-stone-400 dark:text-text-faint">
                  {pos.entry_date
                    ? new Date(pos.entry_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
                <span className="text-[10px] text-stone-400 dark:text-text-faint">
                  {days}d open
                </span>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-xs text-stone-400 dark:text-text-faint text-center py-8">
            No {filter} positions
          </p>
        )}
      </div>
    </>
  );
}
