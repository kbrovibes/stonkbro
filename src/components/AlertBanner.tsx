"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivacy } from "@/components/PrivacyProvider";

type Alert = {
  id: string;
  created_at: string;
  severity: "critical" | "warning" | "info";
  kind: string;
  symbol: string | null;
  title: string;
  body: string;
  action: string | null;
  url: string;
};

const POLL_MS = 5 * 60_000;

// Alert copy can name holdings and dollar levels, so the whole message is
// withheld under the privacy lock — only the fact that alerts exist shows.
const HIDDEN_ALERT = "🔒 Alert hidden — unlock private info to view";

/**
 * Compact "folder" for unacknowledged critical/warning alerts: a one-row
 * summary (key alert + counts + symbols) with expand and clear-all right
 * there, opening into a scrollable tray. Critical alerts sort first.
 */
export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { locked } = usePrivacy();

  const load = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    fetch("/api/alerts?unacked=1&hours=48")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.alerts) return;
        setAlerts(
          (d.alerts as Alert[]).filter((a) => a.severity === "critical" || a.severity === "warning")
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const ack = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const ackAll = () => {
    setAlerts([]);
    setExpanded(false);
    fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) =>
    a.severity === b.severity
      ? b.created_at.localeCompare(a.created_at)
      : a.severity === "critical"
        ? -1
        : 1
  );
  const top = sorted[0];
  const hasCritical = top.severity === "critical";
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const symbols = [...new Set(alerts.map((a) => a.symbol).filter((s): s is string => !!s))];
  const symbolSummary =
    symbols.slice(0, 3).join(", ") + (symbols.length > 3 ? ` +${symbols.length - 3}` : "");

  const summaryParts = [
    `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`,
    criticalCount > 0 ? `${criticalCount} critical` : null,
    !locked && symbols.length > 0 ? symbolSummary : null,
  ].filter(Boolean);

  return (
    <div className="sticky top-16 z-40 mx-auto w-full max-w-2xl px-2">
      <div className="hood-card rounded-2xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated shadow-lg shadow-stone-200/50 dark:shadow-black/40 overflow-hidden">
        {/* Folder header */}
        <div className="flex items-center gap-2 pl-3 pr-2 py-2.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <span
              className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                hasCritical
                  ? "bg-rose-100 dark:bg-loss-bg text-rose-600 dark:text-loss"
                  : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              <span
                className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center tabular-nums ${
                  hasCritical ? "bg-rose-600 dark:bg-rose-500" : "bg-amber-500"
                }`}
              >
                {alerts.length > 99 ? "99+" : alerts.length}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-stone-900 dark:text-text truncate">
                {locked ? HIDDEN_ALERT : top.title}
              </span>
              <span className="block text-[11px] text-stone-400 dark:text-text-subtle truncate">
                {summaryParts.join(" · ")}
              </span>
            </span>
          </button>
          <button
            onClick={ackAll}
            aria-label="Clear all alerts"
            className="hood-pill shrink-0 text-[11px] font-semibold text-stone-500 dark:text-text-subtle border border-stone-200 dark:border-border-subtle rounded-full px-2.5 py-1 hover:bg-stone-50 dark:hover:bg-surface-muted transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse alerts" : "Expand alerts"}
            className="shrink-0 p-1.5 text-[10px] text-stone-400 dark:text-text-faint"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* Tray */}
        {expanded && (
          <div className="border-t border-stone-100 dark:border-border-subtle max-h-80 overflow-y-auto">
            {sorted.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 px-3.5 py-2.5 border-b border-stone-100 dark:border-border-subtle last:border-b-0"
              >
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    a.severity === "critical"
                      ? "bg-rose-500 dark:bg-loss"
                      : "bg-amber-500 dark:bg-amber-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 dark:text-text leading-snug">
                    {locked ? HIDDEN_ALERT : a.title}
                  </p>
                  {!locked && (
                    <p className="text-[11px] text-stone-500 dark:text-text-subtle leading-snug mt-0.5 line-clamp-2">
                      {a.body}
                    </p>
                  )}
                  {!locked && a.action && (
                    <p className="text-[11px] font-semibold text-stone-700 dark:text-text-muted leading-snug mt-1">
                      👉 {a.action}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Link href={a.url} className="text-[11px] font-bold text-sky-600 dark:text-accent">
                    Open
                  </Link>
                  <button
                    onClick={() => ack(a.id)}
                    className="text-[11px] text-stone-400 dark:text-text-faint hover:text-stone-600 dark:hover:text-text-subtle"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
