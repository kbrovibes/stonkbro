"use client";

import { useState } from "react";
import Link from "next/link";

type PMCCSetup = {
  symbol: string;
  stockPrice: number;
  leaps: { strike: number; expiry: string; dte: number; mid: number; openInterest: number; impliedVolatility: number };
  shortCall: { strike: number; expiry: string; dte: number; mid: number; openInterest: number; impliedVolatility: number };
  netDebit: number;
  maxRisk: number;
  monthlyPremium: number;
  monthlyReturnPct: number;
  annualizedReturn: number;
  breakeven: number;
  leapsDelta: number;
  shortDelta: number;
  capitalRequired: number;
  capitalVs100Shares: number;
  grade: "A" | "B" | "C";
  signals: string[];
  incomeProjection12mo: number;
  capitalEfficiency: number;
};

type SectorInfo = { slug: string; name: string; count: number };

type ScanResponse = {
  setups: PMCCSetup[];
  scannedTickers: string[];
  totalTickers: number;
  errors: { symbol: string; error: string }[];
  sectors: SectorInfo[];
};

type SortMode = "return" | "capital" | "grade";

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong border-emerald-200 dark:border-gain-border",
    B: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
    C: "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle border-stone-200 dark:border-border-default",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[grade] || colors.C}`}>
      {grade}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const bg = rank <= 3 ? "bg-stone-900 dark:bg-surface-elevated text-white" : "bg-stone-200 dark:bg-surface-sunken text-stone-600 dark:text-text-muted";
  return (
    <span className={`text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
      #{rank}
    </span>
  );
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDec(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sortSetups(setups: PMCCSetup[], mode: SortMode): PMCCSetup[] {
  const sorted = [...setups];
  switch (mode) {
    case "return":
      return sorted.sort((a, b) => b.monthlyReturnPct - a.monthlyReturnPct);
    case "capital":
      return sorted.sort((a, b) => a.capitalEfficiency - b.capitalEfficiency);
    case "grade":
      return sorted.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        return b.monthlyReturnPct - a.monthlyReturnPct;
      });
  }
}

const SECTORS = [
  { slug: "ai-infrastructure", name: "AI Infra" },
  { slug: "ai-software", name: "AI Software" },
  { slug: "quantum", name: "Quantum" },
  { slug: "nuclear-energy", name: "Nuclear" },
  { slug: "space-defense", name: "Space" },
  { slug: "fintech", name: "Fintech" },
  { slug: "biotech", name: "Biotech" },
  { slug: "ev-autonomy", name: "EV" },
];

export default function PMCCPicksPage() {
  const [setups, setSetups] = useState<PMCCSetup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState("");
  const [scannedCount, setScannedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [scanComplete, setScanComplete] = useState(false);

  const runScan = async (sector?: string) => {
    setScanning(true);
    setScanComplete(false);
    setSetups([]);
    setActiveSector(sector || null);
    setScanProgress("Initializing scan...");
    setScannedCount(0);
    setTotalCount(0);

    try {
      const url = sector ? `/api/pmcc-scan?sector=${sector}` : "/api/pmcc-scan";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Scan failed");

      const data: ScanResponse = await res.json();
      setSetups(data.setups);
      setScannedCount(data.scannedTickers.length);
      setTotalCount(data.totalTickers);
      setScanComplete(true);
    } catch {
      setScanProgress("Scan failed. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const sorted = sortSetups(setups, sortMode);
  const gradeACount = setups.filter((s) => s.grade === "A").length;

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">PMCC Picks</h2>
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
          Top income-generating PMCC setups ranked by monthly return
        </p>
      </div>

      {/* Sector filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => runScan()}
          disabled={scanning}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            activeSector === null && scanComplete
              ? "bg-stone-900 dark:bg-surface-elevated text-white border-stone-900"
              : "bg-white dark:bg-surface-elevated text-stone-600 dark:text-text-muted border-stone-200 dark:border-border-default hover:border-stone-400"
          } disabled:opacity-50`}
        >
          All
        </button>
        {SECTORS.map((s) => (
          <button
            key={s.slug}
            onClick={() => runScan(s.slug)}
            disabled={scanning}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeSector === s.slug
                ? "bg-stone-900 dark:bg-surface-elevated text-white border-stone-900"
                : "bg-white dark:bg-surface-elevated text-stone-600 dark:text-text-muted border-stone-200 dark:border-border-default hover:border-stone-400"
            } disabled:opacity-50`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Scan button */}
      {!scanning && !scanComplete && (
        <button
          onClick={() => runScan()}
          className="w-full py-3 rounded-xl bg-stone-900 dark:bg-surface-elevated text-white text-sm font-semibold hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
        >
          Scan for Best PMCCs
        </button>
      )}

      {/* Progress */}
      {scanning && (
        <div className="flex items-center gap-3 py-3">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-xs text-stone-500 dark:text-text-subtle">{scanProgress || "Scanning options chains..."}</span>
        </div>
      )}

      {/* Results summary + Sort */}
      {scanComplete && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-text-subtle">
            <span>Found {setups.length} setups across {scannedCount} tickers</span>
            {gradeACount > 0 && <span className="text-emerald-600 dark:text-gain font-semibold">{gradeACount} Grade A</span>}
          </div>
          <div className="flex gap-1">
            {([["grade", "Grade"], ["return", "Return"], ["capital", "Capital"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                  sortMode === mode ? "bg-stone-900 dark:bg-surface-elevated text-white" : "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle hover:bg-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Setup cards */}
      {sorted.length > 0 && (
        <div className="flex flex-col gap-3">
          {sorted.map((setup, i) => {
            const rank = i + 1;
            const gradeColor = setup.grade === "A" ? "border-emerald-200 dark:border-gain-border" : setup.grade === "B" ? "border-amber-200 dark:border-amber-800/50" : "border-stone-200 dark:border-border-default";
            const posParams = new URLSearchParams({
              symbol: setup.symbol,
              strategy: "pmcc",
              leapsStrike: String(setup.leaps.strike),
              leapsExpiry: setup.leaps.expiry,
              leapsCost: String(setup.leaps.mid),
              shortStrike: String(setup.shortCall.strike),
              shortExpiry: setup.shortCall.expiry,
              shortPremium: String(setup.shortCall.mid),
            });

            return (
              <div key={`${setup.symbol}-${setup.leaps.strike}-${setup.shortCall.strike}-${i}`} className={`rounded-xl border ${gradeColor} bg-white dark:bg-surface-elevated overflow-hidden`}>
                {/* Card header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2.5">
                    <RankBadge rank={rank} />
                    <Link href={`/ticker/${setup.symbol}`} className="text-sm font-bold text-stone-900 dark:text-text hover:text-sky-700">
                      {setup.symbol}
                    </Link>
                    <span className="text-xs text-stone-400 dark:text-text-faint">{fmtDec(setup.stockPrice)}</span>
                  </div>
                  <GradeBadge grade={setup.grade} />
                </div>

                {/* Two legs */}
                <div className="grid grid-cols-2 gap-3 px-4 pb-3">
                  <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-accent-bg border border-sky-100 dark:border-accent-border">
                    <p className="text-[10px] font-semibold text-sky-600 dark:text-accent uppercase tracking-wide">Buy LEAPS</p>
                    <p className="text-sm font-bold text-stone-900 dark:text-text mt-1">${setup.leaps.strike} Call</p>
                    <p className="text-[10px] text-stone-500 dark:text-text-subtle">{setup.leaps.expiry} &middot; {setup.leaps.dte}d</p>
                    <p className="text-xs font-semibold text-stone-700 dark:text-text-muted mt-1">{fmtDec(setup.leaps.mid)} &middot; &delta; {setup.leapsDelta.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50">
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-300 uppercase tracking-wide">Sell Call</p>
                    <p className="text-sm font-bold text-stone-900 dark:text-text mt-1">${setup.shortCall.strike} Call</p>
                    <p className="text-[10px] text-stone-500 dark:text-text-subtle">{setup.shortCall.expiry} &middot; {setup.shortCall.dte}d</p>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-gain-strong mt-1">{fmtDec(setup.shortCall.mid)} &middot; &delta; {setup.shortDelta.toFixed(2)}</p>
                  </div>
                </div>

                {/* Key stats row */}
                <div className="border-t border-stone-100 dark:border-border-subtle px-4 py-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-xs font-bold text-stone-900 dark:text-text">{fmt(setup.capitalRequired)}</p>
                      <p className="text-[10px] text-stone-400 dark:text-text-faint">Capital</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-emerald-700 dark:text-gain-strong">{fmt(setup.monthlyPremium)}</p>
                      <p className="text-[10px] text-stone-400 dark:text-text-faint">Monthly</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-stone-900 dark:text-text">{setup.monthlyReturnPct.toFixed(1)}%</p>
                      <p className="text-[10px] text-stone-400 dark:text-text-faint">Mo Return</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-stone-900 dark:text-text">{setup.annualizedReturn.toFixed(0)}%</p>
                      <p className="text-[10px] text-stone-400 dark:text-text-faint">Annualized</p>
                    </div>
                  </div>
                </div>

                {/* Savings + projection */}
                <div className="border-t border-stone-100 dark:border-border-subtle px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 dark:text-text-subtle">
                      Saves <span className="font-semibold text-stone-700 dark:text-text-muted">{setup.capitalVs100Shares.toFixed(0)}%</span> vs 100 shares
                    </span>
                    <span className="text-stone-500 dark:text-text-subtle">
                      12mo: <span className="font-semibold text-emerald-700 dark:text-gain-strong">{fmt(setup.incomeProjection12mo)}</span> on {fmt(setup.capitalRequired)}
                    </span>
                  </div>
                </div>

                {/* Signals */}
                {setup.signals.length > 0 && (
                  <div className="border-t border-stone-100 dark:border-border-subtle px-4 py-2.5 flex flex-wrap gap-1.5">
                    {setup.signals.map((s, j) => (
                      <span key={j} className="text-[10px] font-medium bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action */}
                <div className="border-t border-stone-100 dark:border-border-subtle px-4 py-3 flex justify-end">
                  <Link
                    href={`/positions/new?${posParams.toString()}`}
                    className="text-xs font-semibold text-sky-700 dark:text-accent-hover hover:text-sky-800 flex items-center gap-1"
                  >
                    Add to Positions
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!scanning && !scanComplete && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-text">Ready to find PMCC setups</h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-1 max-w-xs">
            Select a sector or tap scan to find the best Poor Man&apos;s Covered Call setups ranked by income potential.
          </p>
        </div>
      )}

      {/* No results after scan */}
      {scanComplete && setups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-sm font-bold text-stone-900 dark:text-text">No PMCC setups found</h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-1">Try scanning a different sector or all tickers.</p>
        </div>
      )}
    </div>
  );
}
