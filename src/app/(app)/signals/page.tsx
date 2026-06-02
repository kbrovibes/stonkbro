"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Alert = {
  action: "CLOSE" | "ROLL" | "SELL" | "BUY" | "WARNING";
  symbol: string;
  strategy: string;
  message: string;
  urgency: "high" | "medium" | "low";
  details?: string;
};

const actionColors: Record<string, string> = {
  CLOSE: "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong border-emerald-200 dark:border-gain-border",
  ROLL: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
  SELL: "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover border-sky-200 dark:border-accent-border",
  BUY: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
  WARNING: "bg-red-50 dark:bg-loss-bg text-red-600 dark:text-loss border-red-200 dark:border-loss-border",
};

const urgencyOrder = { high: 0, medium: 1, low: 2 };

export default function SignalsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionCount, setPositionCount] = useState(0);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signals");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAlerts(data.alerts || []);
        setPositionCount(data.positionCount || 0);
      }
    } catch {
      setError("Failed to fetch signals");
    }
    setLoading(false);
  };

  const highAlerts = alerts.filter((a) => a.urgency === "high");
  const medAlerts = alerts.filter((a) => a.urgency === "medium");
  const lowAlerts = alerts.filter((a) => a.urgency === "low");

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">Trade Signals</h2>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
            Live analysis of your {positionCount} active position{positionCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchSignals}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-border-default text-xs font-semibold text-stone-700 dark:text-text-muted hover:bg-stone-50 dark:hover:bg-surface-muted disabled:opacity-50 transition-colors"
        >
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-xs text-stone-500 dark:text-text-subtle">Checking positions against live market data...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-loss-border bg-red-50 dark:bg-loss-bg p-4 text-sm text-red-700 dark:text-loss-strong">{error}</div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-gain-bg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-text">All clear</h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-1 max-w-xs">
            {positionCount > 0
              ? "No action needed on your positions right now."
              : "Add positions to start getting trade signals."}
          </p>
          {positionCount === 0 && (
            <Link href="/positions/new" className="mt-4 px-4 py-2 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white text-xs font-semibold">
              Add Position
            </Link>
          )}
        </div>
      )}

      {!loading && highAlerts.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-red-500 dark:text-loss mb-2">Action Required</h3>
          <div className="flex flex-col gap-2">
            {highAlerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {!loading && medAlerts.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-amber-600 dark:text-amber-300 mb-2">Opportunities</h3>
          <div className="flex flex-col gap-2">
            {medAlerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {!loading && lowAlerts.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 dark:text-text-faint mb-2">FYI</h3>
          <div className="flex flex-col gap-2">
            {lowAlerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${actionColors[alert.action]}`}>
          {alert.action}
        </span>
        <span className="text-sm font-bold text-stone-900 dark:text-text">{alert.symbol}</span>
        <span className="text-[10px] text-stone-400 dark:text-text-faint">{alert.strategy}</span>
      </div>
      <p className="text-xs text-stone-700 dark:text-text-muted leading-relaxed">{alert.message}</p>
      {alert.details && (
        <p className="text-[10px] text-stone-400 dark:text-text-faint mt-1">{alert.details}</p>
      )}
    </div>
  );
}
