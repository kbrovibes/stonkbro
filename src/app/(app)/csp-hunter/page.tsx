"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AIModelBadge } from "@/components/AIModelBadge";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";

type Candidate = {
  symbol: string;
  name: string;
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  premium: number;
  delta: number;
  iv: number;
  collateralRequired: number;
  aroc: number;
  contractsAt100k: number;
  totalPremium: number;
  capitalUtilization: number;
  currentPrice: number;
  distanceFromPrice: number;
  openInterest: number;
  volume: number;
  nearSupport: boolean;
  supportLevel: number;
  rsi: number;
  technicalScore: number;
  earningsWithinDTE: boolean;
  earningsDate: string | null;
  daysToEarnings: number | null;
  juiciness: number;
  priority: "high" | "medium" | "low";
  reasoning: string;
  catalyst: string;
};

type CallCandidate = {
  symbol: string;
  name: string;
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  costPerContract: number;
  delta: number;
  iv: number;
  currentPrice: number;
  distanceFromPrice: number;
  openInterest: number;
  volume: number;
  contractsAt100k: number;
  totalCost: number;
  capitalUtilization: number;
  breakeven: number;
  outcome50pct: { price: number; profit: number; returnPct: number };
  outcome100pct: { price: number; profit: number; returnPct: number };
  outcomeHomeRun: { price: number; profit: number; returnPct: number };
  maxLoss: number;
  score: number;
  priority: "high" | "medium" | "low";
  catalyst: string;
  reasoning: string;
};

type DeltaChange = {
  symbol: string;
  strike: number;
  expiry: string;
  changeType: string;
  premiumChangePct?: number;
  arocChange?: number;
  message: string;
};

type ScanRecord = {
  id: string;
  createdAt: string;
  scanType: string;
  candidateCount: number;
  capital: number;
  candidates: Candidate[];
  callCandidates: CallCandidate[];
  leapsCandidates: CallCandidate[];
  delta: {
    new: DeltaChange[];
    premium_increased: DeltaChange[];
    premium_decreased: DeltaChange[];
    dropped: DeltaChange[];
    support_lost: DeltaChange[];
  } | null;
  claudeAnalysis: string | null;
  claudeProvider: string | null;
  claudeModel: string | null;
  status: string;
};

type Tab = "csp" | "calls" | "leaps" | "weekly";

type WeeklyPick = {
  symbol: string;
  type: "csp" | "call" | "leaps";
  strike: number;
  expiry: string;
  dte: number;
  pickPrice: number;
  pickDate: string;
  appearances: number;
  aroc?: number;
  score?: number;
  currentPrice: number | null;
  pricePct: number | null;
  strikeBreached: boolean | null;
};

type WeeklyRecap = {
  picks: WeeklyPick[];
  scanCount: number;
  weekStart: string | null;
};

export default function OptionsScannerPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const [tab, setTab] = useState<Tab>("csp");
  const [weekly, setWeekly] = useState<WeeklyRecap | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const fetchScans = useCallback(async (selectLatest = false) => {
    try {
      if (selectLatest) invalidateCache("/api/csp-hunter");
      const data = await cachedFetchJson<{ scans?: ScanRecord[] }>("/api/csp-hunter", { ttlMs: 5 * 60_000 });
      const fetched = data.scans || [];
      setScans(fetched);
      if (fetched.length > 0) {
        if (selectLatest) {
          setSelectedScan(fetched[0]);
        } else {
          setSelectedScan((prev) => prev ?? fetched[0]);
        }
      }
    } catch (e) {
      console.error("[Options Scanner] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/csp-hunter", { method: "POST" });
      if (res.ok) {
        await fetchScans(true);
      }
    } catch {
      // silent
    } finally {
      setScanning(false);
    }
  };

  const fetchWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const data = await cachedFetchJson<WeeklyRecap>("/api/csp-hunter/weekly-recap", { ttlMs: 10 * 60_000 });
      setWeekly(data);
    } catch {
      // silent
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "weekly" && weekly === null) {
      fetchWeekly();
    }
  }, [tab, weekly, fetchWeekly]);

  const candidates = selectedScan?.candidates ?? [];
  const callCandidates = selectedScan?.callCandidates ?? [];
  const leapsCandidates = selectedScan?.leapsCandidates ?? [];
  const delta = selectedScan?.delta;
  const totalDeltaChanges =
    (delta?.new?.length ?? 0) +
    (delta?.premium_increased?.length ?? 0) +
    (delta?.premium_decreased?.length ?? 0) +
    (delta?.dropped?.length ?? 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20">
        <p className="text-stone-400 dark:text-text-faint text-sm animate-pulse">Loading Options Scanner...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header — slim */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-surface-elevated/90 backdrop-blur border-b border-stone-200 dark:border-border-default">
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-stone-900 dark:text-text truncate">Options Scanner</h1>
            <AIModelBadge />
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-[10px] text-stone-400 dark:text-text-faint hover:text-stone-600 transition shrink-0"
              title="Scan history"
            >
              {scans.length > 1 ? `${scans.length} scans ▾` : ""}
            </button>
          </div>
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white text-[11px] font-semibold rounded-md transition shrink-0"
          >
            {scanning ? "Scanning..." : "Scan"}
          </button>
        </div>

        {showHistory && scans.length > 1 && (
          <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto">
            {scans.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScan(s)}
                className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] transition ${
                  selectedScan?.id === s.id
                    ? "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong border border-emerald-200 dark:border-gain-border"
                    : "bg-stone-50 dark:bg-surface text-stone-500 dark:text-text-subtle border border-stone-200 dark:border-border-default"
                }`}
              >
                {new Date(s.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                · {s.candidateCount}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No scans */}
      {scans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-stone-400 dark:text-text-faint text-sm mb-4">No scans yet. Run your first scan to find options plays.</p>
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg"
          >
            {scanning ? "Scanning..." : "Run First Scan"}
          </button>
        </div>
      )}

      {selectedScan && (
        <>
          {/* Tab switcher — slim */}
          <div className="flex border-b border-stone-200 dark:border-border-default">
            <button
              onClick={() => setTab("csp")}
              className={`flex-1 py-1.5 text-xs font-semibold transition ${
                tab === "csp"
                  ? "text-emerald-600 dark:text-gain border-b-2 border-emerald-600"
                  : "text-stone-400 dark:text-text-faint hover:text-stone-600"
              }`}
            >
              CSPs ({candidates.length})
            </button>
            <button
              onClick={() => setTab("calls")}
              className={`flex-1 py-1.5 text-xs font-semibold transition ${
                tab === "calls"
                  ? "text-sky-600 dark:text-accent border-b-2 border-sky-600"
                  : "text-stone-400 dark:text-text-faint hover:text-stone-600"
              }`}
            >
              Calls ({callCandidates.length})
            </button>
            <button
              onClick={() => setTab("leaps")}
              className={`flex-1 py-1.5 text-xs font-semibold transition ${
                tab === "leaps"
                  ? "text-violet-600 dark:text-violet-300 border-b-2 border-violet-600"
                  : "text-stone-400 dark:text-text-faint hover:text-stone-600"
              }`}
            >
              LEAPS ({leapsCandidates.length})
            </button>
            <button
              onClick={() => setTab("weekly")}
              className={`flex-1 py-1.5 text-xs font-semibold transition ${
                tab === "weekly"
                  ? "text-amber-600 dark:text-amber-300 border-b-2 border-amber-600"
                  : "text-stone-400 dark:text-text-faint hover:text-stone-600"
              }`}
            >
              Weekly
            </button>
          </div>

          {/* CSP tab */}
          {tab === "csp" && (
            <>
              {/* Stats bar — compact */}
              <div className="grid grid-cols-3 gap-px bg-stone-200 dark:bg-surface-sunken border-b border-stone-200 dark:border-border-default">
                {[
                  { label: "Picks", value: candidates.length, color: "text-stone-900 dark:text-text" },
                  { label: "Top AROC", value: `${candidates[0]?.aroc ?? 0}%`, color: "text-emerald-600 dark:text-gain" },
                  { label: "Δ Changes", value: totalDeltaChanges, color: "text-sky-600 dark:text-accent" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white dark:bg-surface-elevated px-2 py-1 text-center flex items-baseline justify-center gap-1.5">
                    <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                    <span className="text-[9px] text-stone-400 dark:text-text-faint uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Delta section — collapsed by default */}
              {delta && totalDeltaChanges > 0 && (
                <div className="border-b border-stone-200 dark:border-border-default bg-amber-50 dark:bg-amber-950/40/50">
                  <button
                    onClick={() => setShowDelta(!showDelta)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-amber-50 transition"
                  >
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Changes Since Last Scan ({totalDeltaChanges})
                    </span>
                    <span className="text-amber-600 dark:text-amber-300 text-[10px]">{showDelta ? "hide" : "show"}</span>
                  </button>
                  {showDelta && (
                    <div className="px-3 pb-2 space-y-1 max-h-32 overflow-y-auto">
                      {delta.premium_increased?.slice(0, 3).map((d, i) => (
                        <div key={`up-${i}`} className="text-[11px] text-emerald-700 dark:text-gain-strong">{d.message}</div>
                      ))}
                      {delta.new?.slice(0, 3).map((d, i) => (
                        <div key={`new-${i}`} className="text-[11px] text-sky-700 dark:text-accent-hover">{d.message}</div>
                      ))}
                      {delta.support_lost?.slice(0, 2).map((d, i) => (
                        <div key={`sl-${i}`} className="text-[11px] text-red-600 dark:text-loss">{d.message}</div>
                      ))}
                      {delta.dropped?.slice(0, 2).map((d, i) => (
                        <div key={`dr-${i}`} className="text-[11px] text-stone-500 dark:text-text-subtle">{d.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Claude Analysis — slim toggle */}
              {selectedScan.claudeAnalysis && (
                <div className="border-b border-stone-200 dark:border-border-default">
                  <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-surface-muted transition"
                  >
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 uppercase tracking-wider">
                      Claude Risk Analysis
                    </span>
                    <span className="text-stone-400 dark:text-text-faint text-[10px]">{showAnalysis ? "hide" : "show"}</span>
                  </button>
                  {showAnalysis && (
                    <div className="px-3 pb-3 text-xs text-stone-700 dark:text-text-muted leading-relaxed whitespace-pre-wrap bg-violet-50 dark:bg-violet-950/40/30">
                      {selectedScan.claudeAnalysis}
                    </div>
                  )}
                </div>
              )}

              {/* CSP cards */}
              <div className="divide-y divide-stone-100 dark:divide-border-subtle">
                {candidates.map((c, i) => (
                  <CSPCard key={`${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
                ))}
              </div>

              {candidates.length === 0 && (
                <div className="py-12 text-center text-stone-400 dark:text-text-faint text-sm">
                  No CSP candidates in this scan.
                </div>
              )}
            </>
          )}

          {/* Calls tab */}
          {tab === "calls" && (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-px bg-stone-200 dark:bg-surface-sunken border-b border-stone-200 dark:border-border-default">
                {[
                  { label: "Picks", value: callCandidates.length, color: "text-stone-900 dark:text-text" },
                  { label: "Best Score", value: `${callCandidates[0]?.score ?? 0}/100`, color: "text-sky-600 dark:text-accent" },
                  { label: "Best +10%", value: callCandidates[0] ? `${callCandidates[0].outcome100pct.returnPct > 0 ? "+" : ""}${callCandidates[0].outcome100pct.returnPct}%` : "—", color: "text-emerald-600 dark:text-gain" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white dark:bg-surface-elevated px-2 py-1 text-center flex items-baseline justify-center gap-1.5">
                    <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                    <span className="text-[9px] text-stone-400 dark:text-text-faint uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="px-3 py-1 bg-sky-50 dark:bg-sky-950/40/50 border-b border-stone-200 dark:border-border-default">
                <p className="text-[10px] text-sky-700 dark:text-accent-hover">
                  60-120 DTE · slightly OTM · $100K · 1 pick/ticker
                </p>
              </div>

              {/* Call cards */}
              <div className="divide-y divide-stone-100 dark:divide-border-subtle">
                {callCandidates.map((c, i) => (
                  <CallCard key={`${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
                ))}
              </div>

              {callCandidates.length === 0 && (
                <div className="py-12 text-center text-stone-400 dark:text-text-faint text-sm">
                  No call candidates in this scan. Run a new scan.
                </div>
              )}
            </>
          )}

          {/* LEAPS tab */}
          {tab === "leaps" && (
            <>
              <div className="grid grid-cols-3 gap-px bg-stone-200 dark:bg-surface-sunken border-b border-stone-200 dark:border-border-default">
                {[
                  { label: "Picks", value: leapsCandidates.length, color: "text-stone-900 dark:text-text" },
                  { label: "Best Score", value: `${leapsCandidates[0]?.score ?? 0}/100`, color: "text-violet-600 dark:text-violet-300" },
                  { label: "Best +10%", value: leapsCandidates[0] ? `${leapsCandidates[0].outcome100pct.returnPct > 0 ? "+" : ""}${leapsCandidates[0].outcome100pct.returnPct}%` : "—", color: "text-emerald-600 dark:text-gain" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white dark:bg-surface-elevated px-2 py-1 text-center flex items-baseline justify-center gap-1.5">
                    <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                    <span className="text-[9px] text-stone-400 dark:text-text-faint uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="px-3 py-1 bg-violet-50 dark:bg-violet-950/40/50 border-b border-stone-200 dark:border-border-default">
                <p className="text-[10px] text-violet-700 dark:text-violet-300">
                  6-18mo LEAPS · slightly OTM · $100K · 1 pick/ticker
                </p>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-border-subtle">
                {leapsCandidates.map((c, i) => (
                  <CallCard key={`leaps-${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
                ))}
              </div>

              {leapsCandidates.length === 0 && (
                <div className="py-12 text-center text-stone-400 dark:text-text-faint text-sm">
                  No LEAPS candidates in this scan. Run a new scan.
                </div>
              )}
            </>
          )}

          {/* Weekly Recap tab */}
          {tab === "weekly" && (
            <WeeklyRecapTab weekly={weekly} loading={weeklyLoading} onRefresh={fetchWeekly} />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Recap Tab
// ---------------------------------------------------------------------------

function WeeklyRecapTab({
  weekly,
  loading,
  onRefresh,
}: {
  weekly: WeeklyRecap | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-stone-400 dark:text-text-faint text-sm animate-pulse">
        Loading weekly recap...
      </div>
    );
  }

  if (!weekly || weekly.picks.length === 0) {
    return (
      <div className="py-16 text-center px-4">
        <p className="text-stone-400 dark:text-text-faint text-sm mb-3">No picks this week yet.</p>
        <p className="text-stone-300 dark:text-text-faint text-xs">Run a scan to start building this week&apos;s history.</p>
      </div>
    );
  }

  const { picks, scanCount, weekStart } = weekly;
  const cspPicks = picks.filter((p) => p.type === "csp");
  const callPicks = picks.filter((p) => p.type === "call");
  const leapsPicks = picks.filter((p) => p.type === "leaps");

  const weekStartLabel = weekStart
    ? new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <>
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-px bg-stone-200 dark:bg-surface-sunken border-b border-stone-200 dark:border-border-default">
        {[
          { label: "Scans This Week", value: scanCount, color: "text-stone-900 dark:text-text" },
          { label: "Unique Tickers", value: new Set(picks.map((p) => p.symbol)).size, color: "text-amber-600 dark:text-amber-300" },
          { label: "Since", value: weekStartLabel, color: "text-stone-500 dark:text-text-subtle" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-surface-elevated px-3 py-2 text-center">
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40/50 border-b border-stone-200 dark:border-border-default flex items-center justify-between">
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          All picks since Monday · price move is stock price, not P&amp;L
        </p>
        <button onClick={onRefresh} className="text-[11px] text-stone-400 dark:text-text-faint hover:text-stone-600 transition">
          Refresh
        </button>
      </div>

      {/* CSPs */}
      {cspPicks.length > 0 && (
        <>
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40/60 border-b border-stone-100 dark:border-border-subtle">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-gain-strong uppercase tracking-wider">
              Cash-Secured Puts ({cspPicks.length})
            </span>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-border-subtle">
            {cspPicks.map((p) => (
              <WeeklyPickRow key={`csp-${p.symbol}-${p.strike}-${p.expiry}`} pick={p} />
            ))}
          </div>
        </>
      )}

      {/* Calls */}
      {callPicks.length > 0 && (
        <>
          <div className="px-4 py-2 bg-sky-50 dark:bg-sky-950/40/60 border-b border-stone-100 dark:border-border-subtle">
            <span className="text-[11px] font-semibold text-sky-700 dark:text-accent-hover uppercase tracking-wider">
              Call Buys ({callPicks.length})
            </span>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-border-subtle">
            {callPicks.map((p) => (
              <WeeklyPickRow key={`call-${p.symbol}-${p.strike}-${p.expiry}`} pick={p} />
            ))}
          </div>
        </>
      )}

      {/* LEAPS */}
      {leapsPicks.length > 0 && (
        <>
          <div className="px-4 py-2 bg-violet-50 dark:bg-violet-950/40/60 border-b border-stone-100 dark:border-border-subtle">
            <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
              LEAPS ({leapsPicks.length})
            </span>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-border-subtle">
            {leapsPicks.map((p) => (
              <WeeklyPickRow key={`leaps-${p.symbol}-${p.strike}-${p.expiry}`} pick={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function WeeklyPickRow({ pick: p }: { pick: WeeklyPick }) {
  const typeColors = { csp: "text-emerald-600 dark:text-gain", call: "text-sky-600 dark:text-accent", leaps: "text-violet-600 dark:text-violet-300" };
  const typeLabel = { csp: "P", call: "C", leaps: "C" };

  const moveColor =
    p.pricePct === null
      ? "text-stone-400 dark:text-text-faint"
      : p.type === "csp"
      ? p.pricePct >= 0
        ? "text-emerald-600 dark:text-gain"
        : "text-red-500 dark:text-loss"
      : p.pricePct >= 0
      ? "text-emerald-600 dark:text-gain"
      : "text-red-500 dark:text-loss";

  const pickDateLabel = new Date(p.pickDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Link
            href={`/ticker/${p.symbol}`}
            className={`text-sm font-bold text-stone-900 dark:text-text hover:${typeColors[p.type]} transition`}
          >
            {p.symbol}
          </Link>
          <span className={`text-xs ${typeColors[p.type]}`}>
            ${p.strike} {typeLabel[p.type]} · {p.expiry.slice(5)}
          </span>
          {p.strikeBreached && (
            <span className="text-[10px] bg-red-100 dark:bg-loss-bg text-red-600 dark:text-loss px-1.5 py-0.5 rounded font-semibold">
              BREACHED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-400 dark:text-text-faint">
          <span>First picked {pickDateLabel}</span>
          <span>·</span>
          <span>
            {p.appearances}× scan{p.appearances !== 1 ? "s" : ""}
          </span>
          {p.type === "csp" && p.aroc != null && (
            <>
              <span>·</span>
              <span>{p.aroc}% AROC</span>
            </>
          )}
          {(p.type === "call" || p.type === "leaps") && p.score != null && (
            <>
              <span>·</span>
              <span>{p.score}/100</span>
            </>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 ml-4">
        <div className={`text-sm font-semibold ${moveColor}`}>
          {p.pricePct === null
            ? "—"
            : `${p.pricePct >= 0 ? "+" : ""}${p.pricePct}%`}
        </div>
        <div className="text-[10px] text-stone-400 dark:text-text-faint">
          {p.currentPrice != null ? `$${p.currentPrice.toFixed(2)}` : "—"}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSP Card (same as before, capped at 5)
// ---------------------------------------------------------------------------

function CSPCard({ candidate: c, rank }: { candidate: Candidate; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColors = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-stone-400 dark:bg-text-faint",
  };

  return (
    <div
      className="px-3 py-1.5 hover:bg-stone-50/50 dark:hover:bg-surface-muted/50 transition cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-stone-300 dark:text-text-faint text-[10px] w-4 shrink-0 text-right">{rank}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColors[c.priority]}`} />
          <Link
            href={`/ticker/${c.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-bold text-stone-900 dark:text-text hover:text-emerald-600 transition"
          >
            {c.symbol}
          </Link>
          <span className="text-[11px] text-stone-400 dark:text-text-faint truncate">
            ${c.strike}P · {c.expiry.slice(5)} · {c.dte}d
          </span>
          <span className="text-[11px] text-stone-500 dark:text-text-subtle shrink-0">${c.mid.toFixed(2)}</span>
          <span className="text-[11px] text-emerald-600 dark:text-gain shrink-0">${(c.totalPremium / 1000).toFixed(1)}k</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[13px] font-semibold text-emerald-600 dark:text-gain">{c.aroc}%</span>
        </div>
      </div>

      {c.catalyst && (
        <p className="text-[10px] text-stone-500 dark:text-text-subtle mt-0.5 ml-6 italic leading-tight truncate">{c.catalyst}</p>
      )}

      {expanded && (
        <div className="mt-2 ml-6 p-2.5 bg-stone-50 dark:bg-surface rounded-lg border border-stone-200 dark:border-border-default text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-stone-500 dark:text-text-subtle">
            <div>Current Price: <span className="text-stone-900 dark:text-text">${c.currentPrice.toFixed(2)}</span></div>
            <div>Strike: <span className="text-stone-900 dark:text-text">${c.strike.toFixed(2)}</span></div>
            <div>Bid/Ask: <span className="text-stone-900 dark:text-text">${c.bid.toFixed(2)} / ${c.ask.toFixed(2)}</span></div>
            <div>Premium: <span className="text-emerald-600 dark:text-gain">${c.premium.toFixed(0)}</span></div>
            <div>Collateral: <span className="text-stone-900 dark:text-text">${c.collateralRequired.toLocaleString()}</span></div>
            <div>Contracts @ $100K: <span className="text-stone-900 dark:text-text">{c.contractsAt100k}</span></div>
            <div>Total Premium: <span className="text-emerald-600 dark:text-gain">${c.totalPremium.toLocaleString()}</span></div>
            <div>Capital Used: <span className="text-stone-900 dark:text-text">{c.capitalUtilization}%</span></div>
            <div>OI: <span className="text-stone-900 dark:text-text">{c.openInterest.toLocaleString()}</span></div>
            <div>Volume: <span className="text-stone-900 dark:text-text">{c.volume.toLocaleString()}</span></div>
            <div>Delta: <span className="text-stone-900 dark:text-text">{c.delta.toFixed(2)}</span></div>
            <div>IV: <span className="text-stone-900 dark:text-text">{(c.iv * 100).toFixed(0)}%</span></div>
          </div>
          <div className="pt-2 border-t border-stone-200 dark:border-border-default text-stone-600 dark:text-text-muted">
            {c.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Call Card — shows outcome scenarios prominently
// ---------------------------------------------------------------------------

function CallCard({ candidate: c, rank }: { candidate: CallCandidate; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColors = {
    high: "bg-sky-500",
    medium: "bg-amber-500",
    low: "bg-stone-400 dark:bg-text-faint",
  };

  return (
    <div
      className="px-3 py-1.5 hover:bg-stone-50/50 dark:hover:bg-surface-muted/50 transition cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top row — all the essentials inline */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-stone-300 dark:text-text-faint text-[10px] w-4 shrink-0 text-right">{rank}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColors[c.priority]}`} />
          <Link
            href={`/ticker/${c.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-bold text-stone-900 dark:text-text hover:text-sky-600 transition"
          >
            {c.symbol}
          </Link>
          <span className="text-[11px] text-stone-400 dark:text-text-faint truncate">
            ${c.strike}C · {c.expiry.slice(5)} · {c.dte}d
          </span>
          <span className="text-[11px] text-stone-500 dark:text-text-subtle shrink-0">${c.mid.toFixed(2)}</span>
          <span className="text-[11px] text-stone-400 dark:text-text-faint shrink-0">${(c.totalCost / 1000).toFixed(1)}k</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[13px] font-semibold text-sky-600 dark:text-accent">{c.score}</span>
        </div>
      </div>

      {/* Catalyst — single truncated line */}
      {c.catalyst && (
        <p className="text-[10px] text-stone-500 dark:text-text-subtle mt-0.5 ml-6 italic leading-tight truncate">{c.catalyst}</p>
      )}

      {/* Outcome scenarios — compact inline strip */}
      <div className="mt-1 ml-6 flex items-center gap-1.5 text-[10px]">
        <span className={`px-1.5 py-0.5 rounded ${c.outcome50pct.profit >= 0 ? "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong" : "bg-red-50 dark:bg-loss-bg text-red-600 dark:text-loss"}`}>
          +5%: {c.outcome50pct.profit >= 0 ? "+" : ""}${(Math.abs(c.outcome50pct.profit) / 1000).toFixed(1)}k ({c.outcome50pct.returnPct >= 0 ? "+" : ""}{c.outcome50pct.returnPct}%)
        </span>
        <span className={`px-1.5 py-0.5 rounded ${c.outcome100pct.profit >= 0 ? "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover" : "bg-red-50 dark:bg-loss-bg text-red-600 dark:text-loss"}`}>
          +10%: {c.outcome100pct.profit >= 0 ? "+" : ""}${(Math.abs(c.outcome100pct.profit) / 1000).toFixed(1)}k ({c.outcome100pct.returnPct >= 0 ? "+" : ""}{c.outcome100pct.returnPct}%)
        </span>
        <span className="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
          +20%: +${(c.outcomeHomeRun.profit / 1000).toFixed(1)}k (+{c.outcomeHomeRun.returnPct}%)
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 ml-6 p-2.5 bg-stone-50 dark:bg-surface rounded-lg border border-stone-200 dark:border-border-default text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-stone-500 dark:text-text-subtle">
            <div>Current Price: <span className="text-stone-900 dark:text-text">${c.currentPrice.toFixed(2)}</span></div>
            <div>Strike: <span className="text-stone-900 dark:text-text">${c.strike.toFixed(2)}</span></div>
            <div>Bid/Ask: <span className="text-stone-900 dark:text-text">${c.bid.toFixed(2)} / ${c.ask.toFixed(2)}</span></div>
            <div>Cost/Contract: <span className="text-stone-900 dark:text-text">${c.costPerContract.toLocaleString()}</span></div>
            <div>Contracts @ $100K: <span className="text-stone-900 dark:text-text font-semibold">{c.contractsAt100k}</span></div>
            <div>Total Cost: <span className="text-stone-900 dark:text-text">${c.totalCost.toLocaleString()}</span></div>
            <div>Capital Used: <span className="text-stone-900 dark:text-text">{c.capitalUtilization.toFixed(1)}%</span></div>
            <div>Delta: <span className="text-stone-900 dark:text-text">{c.delta.toFixed(2)}</span></div>
            <div>IV: <span className="text-stone-900 dark:text-text">{(c.iv * 100).toFixed(0)}%</span></div>
            <div>OTM: <span className="text-stone-900 dark:text-text">{c.distanceFromPrice}%</span></div>
            <div>OI: <span className="text-stone-900 dark:text-text">{c.openInterest.toLocaleString()}</span></div>
            <div>Volume: <span className="text-stone-900 dark:text-text">{c.volume.toLocaleString()}</span></div>
          </div>
          <div className="pt-2 border-t border-stone-200 dark:border-border-default text-stone-600 dark:text-text-muted">
            {c.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}
