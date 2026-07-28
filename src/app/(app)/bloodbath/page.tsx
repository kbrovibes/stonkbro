"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// Mirrors GET /api/bloodbath + POST /api/bloodbath/verdict response shapes
interface BloodbathTicker {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  drawdownPct: number;
  peakClose: number;
  peakDate: string;
  fourWeekChangePct: number;
  belowFiftySMA: boolean;
  volumeRatio: number;
  isWatchlist: boolean;
  redStreak?: number;
  worstDayToday?: boolean;
  knife?: boolean;
}

interface Verdict {
  symbol: string;
  verdict: "BUY_DIP" | "NIBBLE" | "WAIT" | "AVOID";
  confidence: "high" | "medium" | "low";
  reasons: string[];
  entryIdea: string;
}

const VERDICT_STYLE: Record<Verdict["verdict"], { label: string; chip: string }> = {
  BUY_DIP: { label: "Buy the dip", chip: "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong" },
  NIBBLE: { label: "Nibble", chip: "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover" },
  WAIT: { label: "Wait", chip: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" },
  AVOID: { label: "Avoid", chip: "bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong" },
};

const VERDICT_LEGEND: { label: string; chip: string; meaning: string }[] = [
  { ...VERDICT_STYLE.BUY_DIP, meaning: "quality name, drop overdone — full-size entry" },
  { ...VERDICT_STYLE.NIBBLE, meaning: "small partial entry (¼–⅓ size) or a conservative CSP below the price" },
  { ...VERDICT_STYLE.WAIT, meaning: "knife still falling or catalyst pending — watch, don't touch" },
  { ...VERDICT_STYLE.AVOID, meaning: "drop is fundamentals-driven — stay away" },
];

const MAX_VERDICT_TICKERS = 12;

function fmtPct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function benchmarkRead(benchmarks: BloodbathTicker[]): string {
  const worst = Math.min(...benchmarks.map((b) => b.drawdownPct));
  const knifing = benchmarks.some((b) => b.knife);
  const base =
    worst <= -10
      ? "Deep, broad market selloff — most drops below are market-driven."
      : worst <= -5
        ? "Market-wide pullback — expect most names to carry this much damage; the excess is company-specific."
        : worst <= -2
          ? "Mild market dip — the big drops below are mostly idiosyncratic."
          : "Indexes are near their highs — the drops below are company-specific.";
  return knifing ? `${base} Indexes are still falling — be patient with entries.` : base;
}

function fmtAge(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Compact grid tile — tap to open the detail sheet. */
function TickerTile({
  t,
  verdict,
  verdictsLoading,
  onOpen,
}: {
  t: BloodbathTicker;
  verdict?: Verdict;
  verdictsLoading: boolean;
  onOpen: () => void;
}) {
  const vs = verdict ? VERDICT_STYLE[verdict.verdict] : null;
  return (
    <button
      onClick={onOpen}
      className="text-left bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-2.5 transition-colors hover:border-stone-300 dark:hover:border-border-strong"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-[13px] text-stone-900 dark:text-text truncate">{t.symbol}</span>
        <span className="text-sm font-bold text-red-600 dark:text-loss shrink-0">
          {t.drawdownPct.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span
          className={`text-[10px] ${t.changePct < 0 ? "text-red-600 dark:text-loss" : "text-emerald-600 dark:text-gain"}`}
        >
          {fmtPct(t.changePct)} today
        </span>
        {t.knife && <span className="text-[10px]" title="Knife still falling">🔪</span>}
      </div>
      <div className="mt-1.5 h-4">
        {vs ? (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${vs.chip}`}>{vs.label}</span>
        ) : verdictsLoading ? (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-surface-muted text-stone-400 dark:text-text-faint animate-pulse">
            AI…
          </span>
        ) : null}
      </div>
    </button>
  );
}

/** Bottom-sheet detail for a selected ticker. */
function DetailSheet({
  t,
  verdict,
  verdictsLoading,
  onClose,
}: {
  t: BloodbathTicker;
  verdict?: Verdict;
  verdictsLoading: boolean;
  onClose: () => void;
}) {
  const vs = verdict ? VERDICT_STYLE[verdict.verdict] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-2xl mx-auto bg-white dark:bg-surface-elevated rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-surface-muted mx-auto mb-3" />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-stone-900 dark:text-text">{t.symbol}</span>
              {t.knife && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong">
                  🔪 falling
                </span>
              )}
              {vs && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vs.chip}`}>{vs.label}</span>
              )}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-text-subtle truncate">{t.name}</div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-full bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mt-3">
          <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
            <div className="text-[9px] text-stone-400 dark:text-text-faint">Off 4-wk peak</div>
            <div className="text-sm font-bold text-red-600 dark:text-loss">{t.drawdownPct.toFixed(1)}%</div>
          </div>
          <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
            <div className="text-[9px] text-stone-400 dark:text-text-faint">Today</div>
            <div className={`text-sm font-bold ${t.changePct < 0 ? "text-red-600 dark:text-loss" : "text-emerald-600 dark:text-gain"}`}>
              {fmtPct(t.changePct)}
            </div>
          </div>
          <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
            <div className="text-[9px] text-stone-400 dark:text-text-faint">Price</div>
            <div className="text-sm font-bold text-stone-800 dark:text-text">${t.price.toFixed(2)}</div>
          </div>
        </div>

        <div className="text-[10px] text-stone-400 dark:text-text-faint mt-2">
          Peaked at ${t.peakClose.toFixed(2)} on {t.peakDate} · {fmtPct(t.fourWeekChangePct)} over 4 weeks
          {t.belowFiftySMA && " · below 50-day SMA"}
          {t.volumeRatio >= 1.5 && ` · ${t.volumeRatio.toFixed(1)}x volume`}
          {(t.redStreak ?? 0) > 0 && ` · ${t.redStreak} straight red day${t.redStreak! > 1 ? "s" : ""}`}
          {t.worstDayToday && " · today is the worst day of the window"}
        </div>

        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-border-default space-y-2 text-xs">
          {verdict ? (
            <>
              <ul className="space-y-1">
                {verdict.reasons.map((r, i) => (
                  <li key={i} className="text-stone-600 dark:text-text-subtle leading-snug">
                    • {r}
                  </li>
                ))}
              </ul>
              {verdict.entryIdea && (
                <div className="bg-stone-50 dark:bg-surface rounded-lg p-2">
                  <span className="text-[9px] font-bold text-stone-400 dark:text-text-faint uppercase tracking-wide">
                    Entry idea
                  </span>
                  <p className="text-stone-700 dark:text-text mt-0.5 leading-snug">{verdict.entryIdea}</p>
                </div>
              )}
              <div className="text-[9px] text-stone-400 dark:text-text-faint">
                Confidence: {verdict.confidence}
              </div>
            </>
          ) : verdictsLoading ? (
            <div className="text-stone-400 dark:text-text-faint animate-pulse">Analyzing the drop…</div>
          ) : (
            <div className="text-stone-400 dark:text-text-faint">No AI verdict for this one yet.</div>
          )}
          <Link
            href={`/ticker/${t.symbol}`}
            className="inline-block text-[10px] font-semibold text-sky-600 dark:text-accent hover:text-sky-700"
          >
            Full ticker view →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BloodbathPage() {
  const [watchlist, setWatchlist] = useState<BloodbathTicker[]>([]);
  const [market, setMarket] = useState<BloodbathTicker[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Map<string, Verdict>>(new Map());
  const [verdictsLoading, setVerdictsLoading] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BloodbathTicker[]>([]);

  const fetchVerdicts = useCallback(async (tickers: BloodbathTicker[], marks: BloodbathTicker[]) => {
    // Watchlist names first (worst drawdown first), then market movers.
    const targets = [
      ...tickers.filter((t) => t.isWatchlist),
      ...tickers.filter((t) => !t.isWatchlist),
    ].slice(0, MAX_VERDICT_TICKERS);
    if (targets.length === 0) return;

    setVerdictsLoading(true);
    setVerdictError(null);
    try {
      const res = await fetch("/api/bloodbath/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: targets,
          benchmarks: marks.map((b) => ({
            symbol: b.symbol,
            drawdownPct: b.drawdownPct,
            changePct: b.changePct,
          })),
        }),
      });
      const data = await res.json();
      if (res.status === 401) throw new Error("Sign in to get AI verdicts");
      if (!res.ok) throw new Error(data.error || "Verdict request failed");
      setVerdicts(new Map((data.verdicts as Verdict[]).map((v) => [v.symbol, v])));
    } catch (e) {
      setVerdictError(e instanceof Error ? e.message : "AI verdicts unavailable");
    } finally {
      setVerdictsLoading(false);
    }
  }, []);

  const loadScan = useCallback(
    async (refresh: boolean) => {
      const res = await fetch(refresh ? "/api/bloodbath?refresh=1" : "/api/bloodbath");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setWatchlist(data.watchlist);
      setMarket(data.market);
      setScannedCount(data.scannedCount);
      setTimestamp(data.timestamp);
      setBenchmarks(data.benchmarks ?? []);
      if (data.verdicts && data.verdicts.length > 0) {
        // Cron-cached scan ships its verdicts — no AI call needed.
        setVerdicts(new Map((data.verdicts as Verdict[]).map((v) => [v.symbol, v])));
        setVerdictError(null);
      } else {
        fetchVerdicts([...data.watchlist, ...data.market], data.benchmarks ?? []);
      }
    },
    [fetchVerdicts]
  );

  useEffect(() => {
    let cancelled = false;
    loadScan(false)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Scan failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadScan]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadScan(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const all = [...watchlist, ...market];
  const down10 = all.filter((t) => t.drawdownPct <= -10).length;
  const worst = all.length > 0 ? all.reduce((a, b) => (b.drawdownPct < a.drawdownPct ? b : a)) : null;
  const selectedTicker = all.find((t) => t.symbol === selected) ?? null;

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-text">🩸 Bloodbath</h1>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
            Who&apos;s bleeding in this pullback — and whether the dip is worth buying.
          </p>
        </div>
        {!loading && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white dark:text-text hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              {refreshing ? "Scanning…" : "Refresh"}
            </button>
            {timestamp && (
              <span className="text-[9px] text-stone-400 dark:text-text-faint">
                as of {fmtAge(timestamp)}
              </span>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="text-2xl animate-pulse">🩸</div>
          <p className="text-xs text-stone-500 dark:text-text-subtle">Scanning the wreckage…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong text-xs rounded-xl p-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {benchmarks.length > 0 && (
            <div className="bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-400 dark:text-text-faint uppercase tracking-wide">
                  Market benchmark
                </span>
                <div className="flex items-center gap-3">
                  {benchmarks.map((b) => (
                    <span key={b.symbol} className="text-[11px]">
                      <span className="font-bold text-stone-800 dark:text-text">{b.symbol}</span>{" "}
                      <span className="font-semibold text-red-600 dark:text-loss">
                        {b.drawdownPct.toFixed(1)}%
                      </span>{" "}
                      <span className="text-stone-400 dark:text-text-faint">
                        ({fmtPct(b.changePct)} today)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-text-subtle mt-1.5 leading-snug">
                {benchmarkRead(benchmarks)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-2.5">
              <div className="text-sm font-bold text-stone-900 dark:text-text">{scannedCount}</div>
              <div className="text-[9px] text-stone-400 dark:text-text-faint">scanned</div>
            </div>
            <div className="bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-2.5">
              <div className="text-sm font-bold text-red-600 dark:text-loss">{down10}</div>
              <div className="text-[9px] text-stone-400 dark:text-text-faint">down 10%+</div>
            </div>
            <div className="bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-2.5">
              <div className="text-sm font-bold text-red-600 dark:text-loss">
                {worst ? `${worst.symbol} ${worst.drawdownPct.toFixed(0)}%` : "—"}
              </div>
              <div className="text-[9px] text-stone-400 dark:text-text-faint">worst hit</div>
            </div>
          </div>

          {/* Sticky quick-nav: jump between sections + verdict legend */}
          <div className="sticky top-16 z-10 -mx-4 px-4 py-2 bg-stone-50/95 dark:bg-surface/95 backdrop-blur border-b border-stone-100 dark:border-border-default flex items-center gap-2">
            {watchlist.length > 0 && (
              <button
                onClick={() => jumpTo("watchlist-section")}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default text-stone-700 dark:text-text"
              >
                ⭐ Watchlist ({watchlist.length})
              </button>
            )}
            {market.length > 0 && (
              <button
                onClick={() => jumpTo("market-section")}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default text-stone-700 dark:text-text"
              >
                📉 Market ({market.length})
              </button>
            )}
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default text-stone-500 dark:text-text-subtle"
            >
              ⓘ Verdicts
            </button>
          </div>

          {legendOpen && (
            <div className="bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-3 space-y-1.5">
              {VERDICT_LEGEND.map((l) => (
                <div key={l.label} className="flex items-baseline gap-2 text-[11px]">
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${l.chip}`}>
                    {l.label}
                  </span>
                  <span className="text-stone-600 dark:text-text-subtle leading-snug">{l.meaning}</span>
                </div>
              ))}
              <div className="flex items-baseline gap-2 text-[11px]">
                <span className="shrink-0 text-[10px]">🔪</span>
                <span className="text-stone-600 dark:text-text-subtle leading-snug">
                  knife still falling — 3+ straight red days, or today is the worst day of the drop
                </span>
              </div>
            </div>
          )}

          {verdictError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] rounded-lg p-2">
              AI verdicts unavailable: {verdictError}
            </div>
          )}

          {watchlist.length > 0 && (
            <div id="watchlist-section" className="flex flex-col gap-2 scroll-mt-28">
              <h2 className="text-sm font-bold text-stone-800 dark:text-text">Your Watchlist</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {watchlist.map((t) => (
                  <TickerTile
                    key={t.symbol}
                    t={t}
                    verdict={verdicts.get(t.symbol)}
                    verdictsLoading={verdictsLoading}
                    onOpen={() => setSelected(t.symbol)}
                  />
                ))}
              </div>
            </div>
          )}

          {market.length > 0 && (
            <div id="market-section" className="flex flex-col gap-2 scroll-mt-28">
              <h2 className="text-sm font-bold text-stone-800 dark:text-text">Big Market Drops</h2>
              <p className="text-[10px] text-stone-400 dark:text-text-faint -mt-1">
                Non-watchlist names down 10%+ from their 4-week peak
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {market.map((t) => (
                  <TickerTile
                    key={t.symbol}
                    t={t}
                    verdict={verdicts.get(t.symbol)}
                    verdictsLoading={verdictsLoading}
                    onOpen={() => setSelected(t.symbol)}
                  />
                ))}
              </div>
            </div>
          )}

          {watchlist.length === 0 && market.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center gap-2">
              <div className="text-2xl">🌤️</div>
              <p className="text-sm font-bold text-stone-900 dark:text-text">No bloodbath detected</p>
              <p className="text-xs text-stone-500 dark:text-text-subtle">
                Nothing in your watchlist or the scan universe is meaningfully off its 4-week peak.
              </p>
            </div>
          )}
        </>
      )}

      {selectedTicker && (
        <DetailSheet
          t={selectedTicker}
          verdict={verdicts.get(selectedTicker.symbol)}
          verdictsLoading={verdictsLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
