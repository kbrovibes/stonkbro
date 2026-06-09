"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AIModelBadge } from "@/components/AIModelBadge";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";

// --- Earnings types ---

// --- Types ---

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  volumeRatio: number;
  direction: "up" | "down";
  explosiveScore: number;
  suggestedPlay: string;
  reasoning: string;
}

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
  model?: string;
}


interface FlowSignal {
  type: string;
  direction: "bullish" | "bearish" | "neutral";
  description: string;
  significance: number;
}

interface FlowSummary {
  symbol: string;
  price: number;
  signals: FlowSignal[];
  putCallRatio: number | null;
  totalCallVolume: number;
  totalPutVolume: number;
  sentiment: "bullish" | "bearish" | "neutral";
  activityScore: number;
}

// --- Constants ---

const THEME_META: Record<string, { label: string; emoji: string }> = {
  moonshot: { label: "Moonshots", emoji: "🚀" },
  local_optimization: { label: "Buy the Dip", emoji: "📉" },
  csp_premium: { label: "CSP Premium", emoji: "💰" },
};

const SENTIMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  bullish: { label: "Bullish", color: "text-emerald-700 dark:text-gain-strong", bg: "bg-emerald-50 dark:bg-gain-bg" },
  bearish: { label: "Bearish", color: "text-red-700 dark:text-loss-strong", bg: "bg-red-50 dark:bg-loss-bg" },
  neutral: { label: "Neutral", color: "text-stone-600 dark:text-text-muted", bg: "bg-stone-100 dark:bg-surface-muted" },
};

const FLOW_TYPE_LABELS: Record<string, string> = {
  large_block: "Block",
  oi_spike: "OI Spike",
  pcr_extreme: "P/C Ratio",
  otm_speculative: "Spec Bet",
  volume_wall: "Wall",
};

// --- Helpers ---

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function updatedAgoText(ts: number | null): string {
  if (!ts) return "";
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  return `Updated ${Math.floor(mins / 60)}h ago`;
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 4 * 60 * 60 * 1000;
}

// --- Spinner component ---

function Spinner({ size = "w-5 h-5" }: { size?: string }) {
  return (
    <svg className={`${size} animate-spin text-stone-400 dark:text-text-faint`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// --- Section wrapper ---

function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-bold text-stone-800 dark:text-text">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  );
}

// =============================================================================
// Main page
// =============================================================================

export default function TodayPage() {
  // Movers
  const [movers, setMovers] = useState<Mover[]>([]);
  const [moversLoading, setMoversLoading] = useState(true);
  const [moversError, setMoversError] = useState<string | null>(null);

  // Recommendations
  const [recommendations, setRecommendations] = useState<ThemeResult[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Earnings

  // Alerts

  // Flow
  const [flow, setFlow] = useState<FlowSummary[]>([]);
  const [flowLoading, setFlowLoading] = useState(true);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowExpanded, setFlowExpanded] = useState<Record<string, boolean>>({});

  // Global
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // --- Fetchers ---

  const fetchMovers = useCallback(async () => {
    setMoversLoading(true);
    try {
      const data = await cachedFetchJson<{ movers?: Mover[] }>("/api/movers", { ttlMs: 5 * 60_000 });
      setMovers(data.movers || []);
      setMoversError(null);
    } catch {
      setMoversError("Could not load movers");
      setMovers([]);
    } finally {
      setMoversLoading(false);
    }
  }, []);

  const fetchRecs = useCallback(async () => {
    setRecsLoading(true);
    try {
      const data = await cachedFetchJson<{ recommendations?: ThemeResult[]; running?: unknown[]; error?: string }>("/api/recommendations", { ttlMs: 5 * 60_000 });
      if (data.error) {
        setRecsError(data.error);
      } else {
        setRecommendations(data.recommendations || []);
        setIsRunning((data.running || []).length > 0);
        setRecsError(null);
      }
    } catch {
      setRecsError("Failed to load recommendations");
    } finally {
      setRecsLoading(false);
    }
  }, []);


  const fetchFlow = useCallback(async () => {
    setFlowLoading(true);
    try {
      const data = await cachedFetchJson<{ flow?: FlowSummary[] }>("/api/flow", { ttlMs: 5 * 60_000 });
      setFlow(data.flow || []);
      setFlowError(null);
    } catch {
      setFlowError("Could not load flow data");
      setFlow([]);
    } finally {
      setFlowLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async (forceFresh = false) => {
    if (forceFresh) {
      invalidateCache("/api/movers");
      invalidateCache("/api/recommendations");
      invalidateCache("/api/flow");
    }
    await Promise.allSettled([fetchMovers(), fetchRecs(), fetchFlow()]);
    setLastUpdated(Date.now());
  }, [fetchMovers, fetchRecs, fetchFlow]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll while recommendations are running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/recommendations?view=status");
        const data = await res.json();
        if ((data.running || []).length === 0) {
          setIsRunning(false);
          fetchRecs();
        }
      } catch {
        // keep polling
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isRunning, fetchRecs]);

  function toggleTheme(theme: string) {
    setCollapsed((prev) => ({ ...prev, [theme]: !prev[theme] }));
  }

  const anyLoading = moversLoading || recsLoading || flowLoading;

  const firstRec = recommendations[0];

  return (
    <div className="flex flex-col flex-1 px-4 py-3 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-text">Today&apos;s Plays</h2>
          <AIModelBadge 
            model={firstRec?.model} 
            timestamp={firstRec?.generatedAt}
          />
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={anyLoading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 active:bg-sky-800 transition-colors disabled:opacity-50"
        >
          {anyLoading ? (
            <>
              <Spinner size="w-3.5 h-3.5" />
              Loading...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Refresh All
            </>
          )}
        </button>
      </div>

      {/* Date + last updated */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] text-stone-400 dark:text-text-faint">{formatDate()}</span>
        {lastUpdated && (
          <span className="text-[10px] text-stone-400 dark:text-text-faint">{updatedAgoText(lastUpdated)}</span>
        )}
      </div>

      {/* ================================================================= */}
      {/* Section 1: Explosive Movers */}
      {/* ================================================================= */}
      <Section
        title="Explosive Movers"
        badge={
          movers.length > 0 ? (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-gain bg-emerald-50 dark:bg-gain-bg px-1.5 py-0.5 rounded-full">
              {movers.length} found
            </span>
          ) : null
        }
      >
        {moversLoading && (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        )}

        {moversError && !moversLoading && (
          <div className="rounded-xl bg-red-50 dark:bg-loss-bg border border-red-100 dark:border-loss-border px-4 py-3">
            <p className="text-xs text-red-600 dark:text-loss">{moversError}</p>
          </div>
        )}

        {!moversLoading && !moversError && movers.length === 0 && (
          <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-6 text-center">
            <p className="text-sm text-stone-500 dark:text-text-subtle">Markets are quiet today</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-1">No explosive moves detected yet</p>
          </div>
        )}

        {!moversLoading && movers.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {movers.map((m) => {
              const isUp = m.direction === "up";
              return (
                <div
                  key={m.symbol}
                  className={`rounded-xl border bg-white dark:bg-surface-elevated px-2 py-2 ${
                    isUp ? "border-emerald-200 dark:border-gain-border" : "border-red-200 dark:border-loss-border"
                  }`}
                >
                  {/* Top row: symbol, change, volume */}
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span className={`text-[11px] font-bold ${isUp ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"}`}>
                      {isUp ? "▲" : "▼"}
                    </span>
                    <Link
                      href={`/ticker/${m.symbol}`}
                      className="text-[11px] font-bold text-stone-900 dark:text-text hover:text-sky-600 transition-colors"
                    >
                      {m.symbol}
                    </Link>
                    <span className={`text-[9px] font-semibold tabular-nums ${isUp ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"}`}>
                      {isUp ? "+" : ""}{m.changePct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-stone-400 dark:text-text-faint">
                      {m.volumeRatio.toFixed(1)}x
                    </span>
                  </div>

                  {/* Name + price */}
                  <p className="text-[9px] text-stone-500 dark:text-text-subtle mb-1 truncate">
                    {m.name} &middot; ${m.price.toFixed(2)}
                  </p>

                  {/* Suggested play */}
                  <p className="text-[9px] font-medium text-stone-800 dark:text-text mb-0.5">
                    {m.suggestedPlay}
                  </p>
                  <p className="text-[9px] text-stone-500 dark:text-text-subtle leading-snug mb-1.5">
                    {m.reasoning}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end flex-wrap">
                    <Link
                      href={`/ticker/${m.symbol}`}
                      className="text-[9px] font-medium text-stone-500 dark:text-text-subtle hover:text-stone-700 transition-colors"
                    >
                      Research &rarr;
                    </Link>
                    <Link
                      href={`/suggestions/${m.symbol}`}
                      className="text-[9px] font-medium text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
                    >
                      Options &rarr;
                    </Link>
                    <Link
                      href={`/positions/new?symbol=${m.symbol}&strategy=Cash-Secured Put`}
                      className="inline-flex items-center rounded-md bg-stone-100 dark:bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium text-stone-700 dark:text-text-muted hover:bg-stone-200 dark:hover:bg-surface-sunken transition-colors"
                    >
                      Log Trade
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Section 2 (Premium Plays) removed — landed empty too often. State kept
          to power the AI model badge in the header. */}
      {false && (
      <Section
        title="Premium Plays"
        badge={
          recommendations.length > 0 ? (
            <span className="text-[10px] font-semibold text-sky-600 dark:text-accent bg-sky-50 dark:bg-accent-bg px-1.5 py-0.5 rounded-full">
              {recommendations.reduce((n, r) => n + r.picks.length, 0)} picks
            </span>
          ) : null
        }
      >
        {/* In-progress banner */}
        {isRunning && (
          <div className="mb-3 rounded-xl border border-sky-200 dark:border-accent-border bg-sky-50 dark:bg-accent-bg px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
            <div>
              <p className="text-xs font-semibold text-sky-800 dark:text-accent-hover">Generating recommendations...</p>
              <p className="text-[10px] text-sky-600 dark:text-accent">Runs in the background. You can leave and come back.</p>
            </div>
          </div>
        )}

        {recsLoading && (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        )}

        {recsError && !recsLoading && (
          <div className="rounded-xl bg-red-50 dark:bg-loss-bg border border-red-100 dark:border-loss-border px-4 py-3">
            <p className="text-xs text-red-600 dark:text-loss">{recsError}</p>
          </div>
        )}

        {!recsLoading && !recsError && recommendations.length === 0 && !isRunning && (
          <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-6 text-center">
            <p className="text-sm text-stone-500 dark:text-text-subtle">No recommendations yet</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-1">
              Hit Refresh All to generate, or they auto-run during market hours.
            </p>
          </div>
        )}

        {!recsLoading && recommendations.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {recommendations.map((rec) => {
              const meta = THEME_META[rec.theme] || { label: rec.theme, emoji: "📊" };
              const isCollapsed = collapsed[rec.theme] ?? false;

              return (
                <div key={rec.theme} className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated overflow-hidden">
                  {/* Theme header */}
                  <button
                    onClick={() => toggleTheme(rec.theme)}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-surface-muted active:bg-sky-50 dark:active:bg-accent-bg transition-colors"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <svg
                        className={`w-3 h-3 shrink-0 text-stone-400 dark:text-text-faint transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="text-xs">{meta.emoji}</span>
                      <span className="text-[11px] font-bold text-stone-900 dark:text-text truncate">{meta.label}</span>
                      <span className="text-[9px] text-stone-400 dark:text-text-faint font-medium shrink-0">{rec.picks.length}</span>
                    </div>
                    <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium shrink-0 ${
                      isStale(rec.generatedAt)
                        ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
                        : "text-stone-400 dark:text-text-faint"
                    }`}>
                      {formatTimeAgo(rec.generatedAt)}
                    </span>
                  </button>

                  {/* Picks */}
                  {!isCollapsed && (
                    <div className="px-2 pb-1.5 flex flex-col gap-1">
                      {rec.picks.map((pick, i) => (
                        <div
                          key={`${pick.symbol}-${i}`}
                          className="rounded-lg bg-stone-50 dark:bg-surface px-2 py-1.5"
                        >
                          {/* Ticker row */}
                          <div className="flex items-center justify-between mb-0.5 gap-1">
                            <div className="flex items-center gap-1 min-w-0 flex-wrap">
                              <Link
                                href={`/ticker/${pick.symbol}`}
                                className="text-[11px] font-bold text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
                              >
                                {pick.symbol}
                              </Link>
                              {pick.price != null && (
                                <span className="text-[9px] text-stone-500 dark:text-text-subtle tabular-nums">
                                  ${pick.price.toFixed(2)}
                                </span>
                              )}
                              {pick.changePct != null && (
                                <span className={`text-[9px] font-semibold tabular-nums ${
                                  pick.changePct >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"
                                }`}>
                                  {pick.changePct >= 0 ? "+" : ""}{pick.changePct.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {pick.strike && pick.premium && (
                              <span className="text-[9px] font-semibold text-emerald-600 dark:text-gain bg-emerald-50 dark:bg-gain-bg px-1 py-0.5 rounded-full shrink-0">
                                ${pick.premium.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Action */}
                          <p className="text-[9px] font-medium text-stone-800 dark:text-text mb-0.5">{pick.action}</p>

                          {/* Rationale */}
                          <p className="text-[9px] text-stone-500 dark:text-text-subtle leading-snug">{pick.rationale}</p>

                          {/* Optional details */}
                          {(pick.target || pick.risk || pick.annualizedReturn) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pick.target && (
                                <span className="text-[9px] text-sky-600 dark:text-accent bg-sky-50 dark:bg-accent-bg px-1 py-0.5 rounded">
                                  Target: {pick.target}
                                </span>
                              )}
                              {pick.annualizedReturn && (
                                <span className="text-[9px] text-emerald-600 dark:text-gain bg-emerald-50 dark:bg-gain-bg px-1 py-0.5 rounded">
                                  {pick.annualizedReturn}
                                </span>
                              )}
                              {pick.risk && (
                                <span className="text-[9px] text-red-500 dark:text-loss bg-red-50 dark:bg-loss-bg px-1 py-0.5 rounded">
                                  Risk: {pick.risk}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 justify-end mt-1 flex-wrap">
                            <Link
                              href={`/ticker/${pick.symbol}`}
                              className="text-[9px] font-medium text-stone-500 dark:text-text-subtle hover:text-stone-700 transition-colors"
                            >
                              Research &rarr;
                            </Link>
                            <Link
                              href={`/positions/new?symbol=${pick.symbol}&strategy=${encodeURIComponent(pick.action?.split(" ")[0] === "Sell" ? "Cash-Secured Put" : "Covered Call")}`}
                              className="inline-flex items-center rounded-md bg-stone-100 dark:bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium text-stone-700 dark:text-text-muted hover:bg-stone-200 dark:hover:bg-surface-sunken transition-colors"
                            >
                              Log
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
      )}


      {/* ================================================================= */}
      {/* Section 4: Options Flow */}
      {/* ================================================================= */}
      <Section
        title="Options Flow"
        badge={
          flow.length > 0 ? (
            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded-full">
              {flow.length} active
            </span>
          ) : null
        }
      >
        {flowLoading && (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        )}

        {flowError && !flowLoading && (
          <div className="rounded-xl bg-red-50 dark:bg-loss-bg border border-red-100 dark:border-loss-border px-4 py-3">
            <p className="text-xs text-red-600 dark:text-loss">{flowError}</p>
          </div>
        )}

        {!flowLoading && !flowError && flow.length === 0 && (
          <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-6 text-center">
            <p className="text-sm text-stone-500 dark:text-text-subtle">No unusual activity</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-1">Options flow looks normal across tracked tickers.</p>
          </div>
        )}

        {!flowLoading && flow.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {flow.map((f) => {
              const sentMeta = SENTIMENT_META[f.sentiment] || SENTIMENT_META.neutral;
              const isExpanded = flowExpanded[f.symbol] ?? false;

              return (
                <div key={f.symbol} className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated overflow-hidden">
                  {/* Header — always visible */}
                  <button
                    onClick={() => setFlowExpanded((prev) => ({ ...prev, [f.symbol]: !prev[f.symbol] }))}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-surface-muted active:bg-violet-50 transition-colors gap-1"
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-wrap">
                      <svg
                        className={`w-3 h-3 shrink-0 text-stone-400 dark:text-text-faint transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                      <Link
                        href={`/ticker/${f.symbol}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-stone-900 dark:text-text hover:text-sky-600 transition-colors"
                      >
                        {f.symbol}
                      </Link>
                      <span className="text-[9px] text-stone-400 dark:text-text-faint tabular-nums">${f.price.toFixed(2)}</span>
                      <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${sentMeta.bg} ${sentMeta.color}`}>
                        {sentMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-stone-400 dark:text-text-faint">{f.signals.length}</span>
                      {/* Activity score bar */}
                      <div className="w-8 h-1 rounded-full bg-stone-100 dark:bg-surface-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            f.activityScore >= 60 ? "bg-violet-500" : f.activityScore >= 30 ? "bg-amber-400" : "bg-stone-300 dark:bg-border-strong"
                          }`}
                          style={{ width: `${f.activityScore}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Stats row */}
                  <div className="px-2 pb-1 flex items-center gap-2 text-[9px] text-stone-400 dark:text-text-faint flex-wrap">
                    <span>C: {f.totalCallVolume.toLocaleString()}</span>
                    <span>P: {f.totalPutVolume.toLocaleString()}</span>
                    {f.putCallRatio != null && (
                      <span className={f.putCallRatio >= 1.5 ? "text-red-500 dark:text-loss font-semibold" : f.putCallRatio <= 0.5 ? "text-emerald-600 dark:text-gain font-semibold" : ""}>
                        P/C: {f.putCallRatio.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Expanded signals */}
                  {isExpanded && (
                    <div className="px-2 pb-1.5 flex flex-col gap-1">
                      {f.signals.map((sig, i) => {
                        const dirColor = sig.direction === "bullish"
                          ? "text-emerald-600 dark:text-gain"
                          : sig.direction === "bearish"
                          ? "text-red-500 dark:text-loss"
                          : "text-stone-500 dark:text-text-subtle";

                        return (
                          <div key={i} className="rounded-lg bg-stone-50 dark:bg-surface px-2 py-1">
                            <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                              <span className="text-[9px] font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-1 py-0.5 rounded">
                                {FLOW_TYPE_LABELS[sig.type] || sig.type}
                              </span>
                              <span className={`text-[9px] font-semibold ${dirColor}`}>
                                {sig.direction === "bullish" ? "▲" : sig.direction === "bearish" ? "▼" : "—"}
                              </span>
                              <div className="flex-1" />
                              <span className="text-[9px] text-stone-400 dark:text-text-faint">{sig.significance}</span>
                            </div>
                            <p className="text-[9px] text-stone-600 dark:text-text-muted leading-snug">{sig.description}</p>
                          </div>
                        );
                      })}

                      {/* CTA */}
                      <div className="flex justify-end mt-1">
                        <Link
                          href={`/suggestions/${f.symbol}`}
                          className="text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
                        >
                          Options &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

    </div>
  );
}
