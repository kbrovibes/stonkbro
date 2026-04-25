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
};

type ScanResult = {
  symbol: string;
  stockPrice: number;
  setups: PMCCSetup[];
  loading: boolean;
  error: string | null;
};

const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "TSLA", "AMD", "PLTR", "META", "AMZN", "GOOGL", "NFLX", "SOFI", "COIN"];

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-50 text-emerald-700 border-emerald-200",
    B: "bg-amber-50 text-amber-700 border-amber-200",
    C: "bg-stone-100 text-stone-500 border-stone-200",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[grade] || colors.C}`}>
      {grade}
    </span>
  );
}

function formatDollar(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [customTicker, setCustomTicker] = useState("");

  const scanTicker = async (symbol: string): Promise<ScanResult> => {
    try {
      const res = await fetch(`/api/options?symbol=${symbol}`);
      if (!res.ok) throw new Error(`Failed to fetch ${symbol}`);
      const data = await res.json();
      return {
        symbol,
        stockPrice: data.quote?.price || 0,
        setups: data.pmccSetups || [],
        loading: false,
        error: null,
      };
    } catch (e) {
      return {
        symbol,
        stockPrice: 0,
        setups: [],
        loading: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  };

  const runScan = async (tickers: string[]) => {
    setScanning(true);
    setScannedCount(0);
    setResults([]);

    // Scan sequentially to avoid rate limits
    const allResults: ScanResult[] = [];
    for (const ticker of tickers) {
      const result = await scanTicker(ticker);
      allResults.push(result);
      setResults([...allResults]);
      setScannedCount((c) => c + 1);
    }

    setScanning(false);
  };

  const addCustomTicker = () => {
    const ticker = customTicker.trim().toUpperCase();
    if (ticker && !results.find((r) => r.symbol === ticker)) {
      setCustomTicker("");
      setScanning(true);
      scanTicker(ticker).then((result) => {
        setResults((prev) => [result, ...prev]);
        setScanning(false);
      });
    }
  };

  const allSetups = results
    .flatMap((r) => r.setups)
    .sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return b.monthlyReturnPct - a.monthlyReturnPct;
    });

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div>
        <h2 className="text-lg font-extrabold text-stone-900">PMCC Scanner</h2>
        <p className="text-xs text-stone-500 mt-0.5">Find the best Poor Man&apos;s Covered Call setups with real options data</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => runScan(DEFAULT_TICKERS)}
          disabled={scanning}
          className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? `Scanning... (${scannedCount}/${DEFAULT_TICKERS.length})` : "Scan Top Tickers for PMCC Setups"}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={customTicker}
            onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addCustomTicker()}
            placeholder="Add ticker (e.g. NVDA)"
            className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm placeholder:text-stone-300 focus:outline-none focus:border-stone-400"
          />
          <button
            onClick={addCustomTicker}
            disabled={scanning || !customTicker.trim()}
            className="px-4 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
          >
            Scan
          </button>
        </div>
      </div>

      {/* Progress */}
      {scanning && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-xs text-stone-500">Fetching live options chains...</span>
        </div>
      )}

      {/* Results summary */}
      {results.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span>{results.length} tickers scanned</span>
          <span>{allSetups.length} PMCC setups found</span>
          <span>{allSetups.filter((s) => s.grade === "A").length} grade A</span>
        </div>
      )}

      {/* Setup cards */}
      {allSetups.length > 0 && (
        <div className="flex flex-col gap-3">
          {allSetups.map((setup, i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link href={`/ticker/${setup.symbol}`} className="text-sm font-bold text-stone-900 hover:text-sky-700">
                    {setup.symbol}
                  </Link>
                  <span className="text-xs text-stone-400">${setup.stockPrice.toFixed(2)}</span>
                  <GradeBadge grade={setup.grade} />
                </div>
                <span className="text-sm font-bold text-emerald-700">
                  {setup.monthlyReturnPct.toFixed(1)}%/mo
                </span>
              </div>

              {/* Two legs */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100">
                  <p className="text-[10px] font-semibold text-sky-600 uppercase">Buy LEAPS</p>
                  <p className="text-sm font-bold text-stone-900 mt-1">${setup.leaps.strike} Call</p>
                  <p className="text-[10px] text-stone-500">{setup.leaps.expiry} · {setup.leaps.dte}d</p>
                  <p className="text-xs font-semibold text-stone-700 mt-1">{formatDollar(setup.leaps.mid)}</p>
                  <p className="text-[10px] text-stone-400">Delta ~{setup.leapsDelta.toFixed(2)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase">Sell Call</p>
                  <p className="text-sm font-bold text-stone-900 mt-1">${setup.shortCall.strike} Call</p>
                  <p className="text-[10px] text-stone-500">{setup.shortCall.expiry} · {setup.shortCall.dte}d</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-1">{formatDollar(setup.shortCall.mid)}</p>
                  <p className="text-[10px] text-stone-400">Delta ~{setup.shortDelta.toFixed(2)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-xs font-bold text-stone-900">{formatDollar(setup.capitalRequired)}</p>
                  <p className="text-[10px] text-stone-400">Capital</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-emerald-700">{formatDollar(setup.monthlyPremium)}</p>
                  <p className="text-[10px] text-stone-400">Monthly</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-stone-900">{setup.annualizedReturn.toFixed(0)}%</p>
                  <p className="text-[10px] text-stone-400">Annualized</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-stone-900">${setup.breakeven.toFixed(0)}</p>
                  <p className="text-[10px] text-stone-400">Breakeven</p>
                </div>
              </div>

              {/* Signals */}
              {setup.signals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {setup.signals.map((s, j) => (
                    <span key={j} className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!scanning && results.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900">Ready to scan</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">
            Hit the button above to scan top tickers for PMCC setups using live options chain data.
          </p>
        </div>
      )}

      {/* Tickers with no setups */}
      {results.filter((r) => r.setups.length === 0 && !r.error).length > 0 && (
        <div className="text-xs text-stone-400">
          <span className="font-medium">No PMCC setups found for: </span>
          {results.filter((r) => r.setups.length === 0 && !r.error).map((r) => r.symbol).join(", ")}
        </div>
      )}

      {/* Errors */}
      {results.filter((r) => r.error).length > 0 && (
        <div className="text-xs text-red-500">
          <span className="font-medium">Errors: </span>
          {results.filter((r) => r.error).map((r) => `${r.symbol}: ${r.error}`).join(", ")}
        </div>
      )}
    </div>
  );
}
