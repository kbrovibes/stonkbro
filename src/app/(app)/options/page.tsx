"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRefreshEvent } from "@/hooks/useRefreshEvent";
import Link from "next/link";

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

type ScanRecord = {
  id: string;
  createdAt: string;
  scanType: string;
  candidateCount: number;
  capital: number;
  candidates: Candidate[];
  callCandidates: CallCandidate[];
  leapsCandidates: CallCandidate[];
  delta: unknown;
  claudeAnalysis: string | null;
  claudeProvider: string | null;
  claudeModel: string | null;
  status: string;
};

type Tab = "csp" | "calls" | "leaps";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-600 bg-amber-50",
  low: "text-stone-500 bg-stone-100",
};

function formatAge(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function isStale(isoDate: string): boolean {
  return Date.now() - new Date(isoDate).getTime() > 4 * 60 * 60 * 1000;
}

export default function OptionsPage() {
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [tab, setTab] = useState<Tab>("csp");

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/csp-hunter");
      if (!res.ok) throw new Error("Failed to fetch scan data");
      const json = await res.json();
      const scans: ScanRecord[] = json.scans ?? [];
      setScan(scans[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  const autoScannedRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    fetchLatest().then(() => {
      // Auto-scan if data is stale and we haven't already triggered one this session
      setScan(prev => {
        if (prev && isStale(prev.createdAt) && !autoScannedRef.current) {
          autoScannedRef.current = true;
          fetch("/api/csp-hunter", { method: "POST" })
            .then(r => r.ok ? fetchLatest() : Promise.resolve())
            .catch(() => {});
        }
        return prev;
      });
    }).finally(() => setLoading(false));
  }, [fetchLatest]);

  // Re-fetch when pull-to-refresh fires
  useRefreshEvent(fetchLatest);

  const handleScanNow = async () => {
    setLoginRequired(false);
    setError(null);
    setScanning(true);
    try {
      const res = await fetch("/api/csp-hunter", { method: "POST" });
      if (res.status === 401) {
        setLoginRequired(true);
        return;
      }
      if (!res.ok) throw new Error("Scan failed");
      await fetchLatest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-10">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-sky-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-stone-500 font-medium">Loading scan data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Options Scanner</h1>
          <p className="text-xs text-stone-500 mt-0.5">CSP · Calls · LEAPS — live scanner data</p>
        </div>
        <button
          onClick={handleScanNow}
          disabled={scanning}
          className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
            scanning
              ? "opacity-50 cursor-not-allowed border-stone-200 text-stone-400"
              : "border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 active:scale-95"
          }`}
        >
          {scanning ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Scanning...
            </span>
          ) : (
            "Scan Now"
          )}
        </button>
      </div>

      {/* Alerts */}
      {loginRequired && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 font-medium">
          Login to run a scan
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {scan ? (
        <div className="flex flex-col gap-4">
          {/* Timestamp + staleness */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Scanned: {new Date(scan.createdAt).toLocaleString()}
            </span>
            {isStale(scan.createdAt) && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                Stale — data from {formatAge(scan.createdAt)}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
            {(["csp", "calls", "leaps"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide ${
                  tab === t
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {t === "csp" ? "CSP" : t === "calls" ? "Calls" : "LEAPS"}
              </button>
            ))}
          </div>

          {/* CSP Tab */}
          {tab === "csp" && (
            <CSPTab candidates={scan.candidates} claudeAnalysis={scan.claudeAnalysis} />
          )}

          {/* Calls Tab */}
          {tab === "calls" && (
            <CallsTab candidates={scan.callCandidates} />
          )}

          {/* LEAPS Tab */}
          {tab === "leaps" && (
            <LeapsTab candidates={scan.leapsCandidates} />
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
          <p className="text-sm text-stone-400 font-medium">No scan data found. Tap Scan Now to run a scan.</p>
        </div>
      )}

      <div className="h-20" /> {/* Spacer for BottomNav */}
    </div>
  );
}

function CSPTab({ candidates, claudeAnalysis }: { candidates: Candidate[]; claudeAnalysis: string | null }) {
  if (candidates.length === 0) {
    return <EmptyState message="No CSP candidates in this scan." />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase">Stock</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase">DTE</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Strike</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Premium</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {candidates.map((c, idx) => (
                <tr key={`${c.symbol}-${idx}`} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-3 py-3">
                    <Link href={`/ticker/${c.symbol}`} className="block">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-sky-600 transition-colors">{c.symbol}</span>
                      <div className="text-[9px] text-stone-400 font-medium">${c.currentPrice?.toFixed(2)}</div>
                    </Link>
                    <span className={`mt-0.5 inline-block px-1 py-0.5 rounded text-[9px] font-bold uppercase ${PRIORITY_COLORS[c.priority]}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-stone-600">{c.dte}d</td>
                  <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">
                    ${c.strike.toFixed(2)}
                    <div className="text-[9px] text-stone-400 font-medium">{c.distanceFromPrice?.toFixed(1)}% OTM</div>
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-right">${c.premium?.toFixed(2)}</td>
                  <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">{c.aroc?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rationale cards */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-stone-900 px-1">Rationale</h3>
        <div className="grid gap-3">
          {candidates.map((c, idx) => (
            <div key={`rationale-${c.symbol}-${idx}`} className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-stone-900">{c.symbol}</span>
                <span className="text-[10px] font-medium text-stone-500">Sell ${c.strike} Put · {c.dte}d</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">{c.reasoning}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Claude analysis */}
      {claudeAnalysis && (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
          <h3 className="text-xs font-bold text-sky-900 mb-2">AI Analysis</h3>
          <p className="text-[11px] text-sky-800 leading-relaxed whitespace-pre-wrap">{claudeAnalysis}</p>
        </div>
      )}
    </div>
  );
}

function CallsTab({ candidates }: { candidates: CallCandidate[] }) {
  if (candidates.length === 0) {
    return <EmptyState message="No call candidates in this scan." />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase">Stock</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase">DTE</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Strike</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Breakeven</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">50% Ret</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {candidates.map((c, idx) => (
                <tr key={`${c.symbol}-${idx}`} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-3 py-3">
                    <Link href={`/ticker/${c.symbol}`} className="block">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-sky-600 transition-colors">{c.symbol}</span>
                      <div className="text-[9px] text-stone-400 font-medium">${c.currentPrice?.toFixed(2)}</div>
                    </Link>
                    <span className={`mt-0.5 inline-block px-1 py-0.5 rounded text-[9px] font-bold uppercase ${PRIORITY_COLORS[c.priority]}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-stone-600">{c.dte}d</td>
                  <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">
                    ${c.strike.toFixed(2)}
                    <div className="text-[9px] text-stone-400 font-medium">{c.distanceFromPrice?.toFixed(1)}% OTM</div>
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">${c.breakeven?.toFixed(2)}</td>
                  <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-right">
                    {c.outcome50pct?.returnPct != null ? `${c.outcome50pct.returnPct.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-stone-900 px-1">Rationale</h3>
        <div className="grid gap-3">
          {candidates.map((c, idx) => (
            <div key={`rationale-${c.symbol}-${idx}`} className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-stone-900">{c.symbol}</span>
                <span className="text-[10px] font-medium text-stone-500">Buy ${c.strike} Call · {c.dte}d</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">{c.reasoning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeapsTab({ candidates }: { candidates: CallCandidate[] }) {
  if (candidates.length === 0) {
    return <EmptyState message="No LEAPS candidates in this scan." />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase">Stock</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase">DTE</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Strike</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Confidence</th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-stone-500 uppercase text-right">Breakeven</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {candidates.map((c, idx) => (
                <tr key={`${c.symbol}-${idx}`} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-3 py-3">
                    <Link href={`/ticker/${c.symbol}`} className="block">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-sky-600 transition-colors">{c.symbol}</span>
                      <div className="text-[9px] text-stone-400 font-medium">${c.currentPrice?.toFixed(2)}</div>
                    </Link>
                    <span className={`mt-0.5 inline-block px-1 py-0.5 rounded text-[9px] font-bold uppercase ${PRIORITY_COLORS[c.priority]}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-stone-600">{c.dte}d</td>
                  <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">
                    ${c.strike.toFixed(2)}
                    <div className="text-[9px] text-stone-400 font-medium">{c.distanceFromPrice?.toFixed(1)}% OTM</div>
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-sky-600 text-right">
                    {c.score != null ? `${Math.round(c.score)}/100` : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">${c.breakeven?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-stone-900 px-1">Rationale</h3>
        <div className="grid gap-3">
          {candidates.map((c, idx) => (
            <div key={`rationale-${c.symbol}-${idx}`} className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-stone-900">{c.symbol}</span>
                <span className="text-[10px] font-medium text-stone-500">Buy ${c.strike} LEAPS · {c.dte}d</span>
                {c.score != null && (
                  <span className="text-[9px] font-bold text-sky-600">{Math.round(c.score)}/100 confidence</span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">{c.reasoning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
      <p className="text-sm text-stone-400 font-medium">{message}</p>
    </div>
  );
}
