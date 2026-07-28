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

const MAX_VERDICT_TICKERS = 12;

function fmtPct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function fmtAge(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function TickerCard({
  t,
  verdict,
  verdictsLoading,
  expanded,
  onToggle,
}: {
  t: BloodbathTicker;
  verdict?: Verdict;
  verdictsLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const vs = verdict ? VERDICT_STYLE[verdict.verdict] : null;
  const severe = t.drawdownPct <= -20;

  return (
    <div
      onClick={onToggle}
      className="w-full text-left cursor-pointer bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default rounded-xl p-3 transition-colors hover:border-stone-300 dark:hover:border-border-strong"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-stone-900 dark:text-text">{t.symbol}</span>
            {severe && <span className="text-[10px]">🩸</span>}
            {vs ? (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${vs.chip}`}>{vs.label}</span>
            ) : verdictsLoading ? (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-surface-muted text-stone-400 dark:text-text-faint animate-pulse">
                AI weighing in…
              </span>
            ) : null}
          </div>
          <div className="text-[10px] text-stone-500 dark:text-text-subtle truncate">{t.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-red-600 dark:text-loss">{t.drawdownPct.toFixed(1)}%</div>
          <div className="text-[9px] text-stone-400 dark:text-text-faint">off 4-wk peak</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500 dark:text-text-subtle">
        <span className="font-mono text-stone-700 dark:text-text">${t.price.toFixed(2)}</span>
        <span className={t.changePct < 0 ? "text-red-600 dark:text-loss" : "text-emerald-600 dark:text-gain"}>
          {fmtPct(t.changePct)} today
        </span>
        <span>{fmtPct(t.fourWeekChangePct)} / 4wk</span>
        {t.belowFiftySMA && <span className="text-amber-600 dark:text-amber-300">&lt; 50d</span>}
        {t.volumeRatio >= 1.5 && <span>{t.volumeRatio.toFixed(1)}x vol</span>}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-border-default space-y-2 text-xs">
          <div className="text-[10px] text-stone-400 dark:text-text-faint">
            Peaked at ${t.peakClose.toFixed(2)} on {t.peakDate}
          </div>
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
            onClick={(e) => e.stopPropagation()}
          >
            Full ticker view →
          </Link>
        </div>
      )}
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVerdicts = useCallback(async (tickers: BloodbathTicker[]) => {
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
        body: JSON.stringify({ tickers: targets }),
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
      if (data.verdicts && data.verdicts.length > 0) {
        // Cron-cached scan ships its verdicts — no AI call needed.
        setVerdicts(new Map((data.verdicts as Verdict[]).map((v) => [v.symbol, v])));
        setVerdictError(null);
      } else {
        fetchVerdicts([...data.watchlist, ...data.market]);
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

  const all = [...watchlist, ...market];
  const down10 = all.filter((t) => t.drawdownPct <= -10).length;
  const worst = all.length > 0 ? all.reduce((a, b) => (b.drawdownPct < a.drawdownPct ? b : a)) : null;

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
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

          {verdictError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] rounded-lg p-2">
              AI verdicts unavailable: {verdictError}
            </div>
          )}

          {watchlist.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-stone-800 dark:text-text">Your Watchlist</h2>
              {watchlist.map((t) => (
                <TickerCard
                  key={t.symbol}
                  t={t}
                  verdict={verdicts.get(t.symbol)}
                  verdictsLoading={verdictsLoading}
                  expanded={expanded === t.symbol}
                  onToggle={() => setExpanded(expanded === t.symbol ? null : t.symbol)}
                />
              ))}
            </div>
          )}

          {market.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-stone-800 dark:text-text">Big Market Drops</h2>
              <p className="text-[10px] text-stone-400 dark:text-text-faint -mt-1">
                Non-watchlist names down 10%+ from their 4-week peak
              </p>
              {market.map((t) => (
                <TickerCard
                  key={t.symbol}
                  t={t}
                  verdict={verdicts.get(t.symbol)}
                  verdictsLoading={verdictsLoading}
                  expanded={expanded === t.symbol}
                  onToggle={() => setExpanded(expanded === t.symbol ? null : t.symbol)}
                />
              ))}
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
    </div>
  );
}
