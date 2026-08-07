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
 * Sticky banner for unacknowledged critical/warning alerts so a market event
 * is impossible to miss even with push notifications swiped away.
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

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const top = alerts[0];

  return (
    <div
      className={`sticky top-16 z-40 mx-auto w-full max-w-2xl px-2 ${
        hasCritical ? "" : ""
      }`}
    >
      <div
        className={`rounded-xl border shadow-lg overflow-hidden ${
          hasCritical
            ? "bg-rose-600 border-rose-700 text-white"
            : "bg-amber-500 border-amber-600 text-white"
        }`}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">
              {locked ? HIDDEN_ALERT : top.title}
            </div>
            {!expanded && (
              <div className="text-[11px] opacity-90 truncate">
                {alerts.length > 1 ? `+${alerts.length - 1} more — tap to expand` : "Tap for details"}
              </div>
            )}
          </div>
          <span className="text-xs opacity-80 shrink-0">{expanded ? "▲" : "▼"}</span>
        </button>

        {expanded && (
          <div className="px-4 pb-3 flex flex-col gap-3">
            {alerts.map((a) => (
              <div key={a.id} className="border-t border-white/20 pt-2.5">
                <div className="text-[13px] font-semibold">
                  {locked ? HIDDEN_ALERT : a.title}
                </div>
                {!locked && (
                  <p className="text-[12px] opacity-95 mt-0.5 leading-snug">{a.body}</p>
                )}
                {!locked && a.action && (
                  <p className="text-[12px] font-semibold mt-1.5 bg-white/15 rounded-lg px-2.5 py-1.5 leading-snug">
                    👉 {a.action}
                  </p>
                )}
                <div className="flex gap-3 mt-1.5">
                  <Link href={a.url} className="text-[11px] font-bold underline underline-offset-2">
                    Open
                  </Link>
                  <button onClick={() => ack(a.id)} className="text-[11px] opacity-80">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={ackAll}
              className="self-end text-[11px] font-semibold opacity-90 underline underline-offset-2"
            >
              Dismiss all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
