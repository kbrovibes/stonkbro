"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Pick {
  symbol: string;
  rationale: string;
  action: string;
  target?: string;
  risk?: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  annualizedReturn?: string;
  price?: number;
  changePct?: number;
}

interface ThemeResult {
  theme: string;
  picks: Pick[];
  generatedAt: string;
  expiresAt: string;
}

const THEME_META: Record<string, { label: string; emoji: string; color: string }> = {
  moonshot: { label: "Moonshots", emoji: "🚀", color: "sky" },
  local_optimization: { label: "Buy the Dip", emoji: "📉", color: "amber" },
  csp_premium: { label: "CSP Premium", emoji: "💰", color: "emerald" },
};

// Cron schedule: every 2 hours from 9:00 AM ET to 4:00 PM ET, weekdays
const CRON_HOURS_ET = [9, 11, 13, 15]; // 9AM, 11AM, 1PM, 3PM ET

function getNextRefreshTime(): Date {
  const now = new Date();
  // Convert to ET
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const etHour = et.getHours();
  const etDay = et.getDay(); // 0=Sun, 6=Sat

  // Find next cron slot
  for (const h of CRON_HOURS_ET) {
    if (etHour < h || (etHour === h && et.getMinutes() < 0)) {
      // This slot is still ahead today (if weekday)
      if (etDay >= 1 && etDay <= 5) {
        const next = new Date(et);
        next.setHours(h, 0, 0, 0);
        // Convert back to local
        return new Date(next.toLocaleString("en-US", { timeZone: "America/New_York" }));
      }
    }
  }

  // Next slot is tomorrow (or next Monday if weekend)
  const next = new Date(et);
  if (etDay === 5) next.setDate(next.getDate() + 3); // Fri -> Mon
  else if (etDay === 6) next.setDate(next.getDate() + 2); // Sat -> Mon
  else next.setDate(next.getDate() + 1);
  next.setHours(CRON_HOURS_ET[0], 0, 0, 0);
  return next;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function TodayPage() {
  const [recommendations, setRecommendations] = useState<ThemeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchRecs = useCallback(async () => {
    try {
      const res = await fetch("/api/recommendations");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRecommendations(data.recommendations || []);
        setError(null);
      }
    } catch {
      setError("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  async function handleForceRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRecommendations(data.recommendations || []);
        setError(null);
      }
    } catch {
      setError("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  function toggleTheme(theme: string) {
    setCollapsed((prev) => ({ ...prev, [theme]: !prev[theme] }));
  }

  const latestGenerated = recommendations.length > 0
    ? recommendations.reduce((latest, r) =>
        new Date(r.generatedAt) > new Date(latest.generatedAt) ? r : latest
      )
    : null;

  const nextRefresh = getNextRefreshTime();

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-stone-900">Today</h2>
        <button
          onClick={handleForceRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 active:bg-sky-800 transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 mb-4">
        {latestGenerated && (
          <span className="text-[10px] text-stone-400">
            Updated {formatTimeAgo(latestGenerated.generatedAt)}
          </span>
        )}
        <span className="text-[10px] text-stone-400">
          Next: {formatTime(nextRefresh)}
        </span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-400">Loading recommendations...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
          <p className="text-xs text-red-600 font-medium">{error}</p>
          <p className="text-[10px] text-red-400 mt-1">
            Try force refreshing, or recommendations will auto-generate on the next cron cycle.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-3xl">⚡</span>
          <p className="text-sm font-medium text-stone-700">No recommendations yet</p>
          <p className="text-xs text-stone-400 max-w-xs">
            Recommendations are generated automatically every 2 hours during market hours.
            Hit Refresh to generate now.
          </p>
        </div>
      )}

      {/* Recommendation themes */}
      {!loading && recommendations.length > 0 && (
        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => {
            const meta = THEME_META[rec.theme] || { label: rec.theme, emoji: "📊", color: "stone" };
            const isCollapsed = collapsed[rec.theme] ?? false;

            return (
              <div key={rec.theme} className="rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Theme header — collapsible */}
                <button
                  onClick={() => toggleTheme(rec.theme)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 active:bg-sky-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                    <span className="text-base">{meta.emoji}</span>
                    <span className="text-sm font-bold text-stone-900">{meta.label}</span>
                    <span className="text-[10px] text-stone-400 font-medium">{rec.picks.length} picks</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    {formatTimeAgo(rec.generatedAt)}
                  </span>
                </button>

                {/* Picks */}
                {!isCollapsed && (
                  <div className="px-4 pb-3 flex flex-col gap-2">
                    {rec.picks.map((pick, i) => (
                      <div
                        key={`${pick.symbol}-${i}`}
                        className="rounded-lg bg-stone-50 px-3 py-2.5"
                      >
                        {/* Ticker row */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/ticker/${pick.symbol}`}
                              className="text-sm font-bold text-sky-600 hover:text-sky-800 transition-colors"
                            >
                              {pick.symbol}
                            </Link>
                            {pick.price != null && (
                              <span className="text-xs text-stone-500 tabular-nums">
                                ${pick.price.toFixed(2)}
                              </span>
                            )}
                            {pick.changePct != null && (
                              <span className={`text-[10px] font-semibold tabular-nums ${
                                pick.changePct >= 0 ? "text-emerald-600" : "text-red-500"
                              }`}>
                                {pick.changePct >= 0 ? "+" : ""}{pick.changePct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {pick.strike && pick.premium && (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              ${pick.premium.toFixed(2)} prem
                            </span>
                          )}
                        </div>

                        {/* Action */}
                        <p className="text-xs font-medium text-stone-800 mb-1">{pick.action}</p>

                        {/* Rationale */}
                        <p className="text-[11px] text-stone-500 leading-relaxed">{pick.rationale}</p>

                        {/* Optional details row */}
                        {(pick.target || pick.risk || pick.annualizedReturn) && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {pick.target && (
                              <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                                Target: {pick.target}
                              </span>
                            )}
                            {pick.annualizedReturn && (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {pick.annualizedReturn}
                              </span>
                            )}
                            {pick.risk && (
                              <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                Risk: {pick.risk}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
