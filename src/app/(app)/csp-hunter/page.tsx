"use client";

import { useState, useEffect, useCallback } from "react";
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
  delta: {
    new: DeltaChange[];
    premium_increased: DeltaChange[];
    premium_decreased: DeltaChange[];
    dropped: DeltaChange[];
    support_lost: DeltaChange[];
  } | null;
  claudeAnalysis: string | null;
  status: string;
};

export default function CSPHunterPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch("/api/csp-hunter");
      if (!res.ok) {
        console.error("[CSP Hunter] fetch failed:", res.status);
        return;
      }
      const data = await res.json();
      const fetched = data.scans || [];
      setScans(fetched);
      if (fetched.length > 0) {
        setSelectedScan((prev) => prev ?? fetched[0]);
      }
    } catch (e) {
      console.error("[CSP Hunter] fetch error:", e);
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
        await fetchScans();
      }
    } catch {
      // silent
    } finally {
      setScanning(false);
    }
  };

  const candidates = selectedScan?.candidates ?? [];
  const filtered =
    filter === "all"
      ? candidates
      : candidates.filter((c) => c.priority === filter);
  const delta = selectedScan?.delta;
  const totalDeltaChanges =
    (delta?.new?.length ?? 0) +
    (delta?.premium_increased?.length ?? 0) +
    (delta?.premium_decreased?.length ?? 0) +
    (delta?.dropped?.length ?? 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Loading CSP Hunter...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-neutral-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-green-400">🎯 CSP Alpha Hunter</h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Cash Secured Puts · 7-21 DTE · δ 0.15-0.30 · $100K capital
              </p>
            </div>
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition"
            >
              {scanning ? "Scanning..." : "Run Scan"}
            </button>
          </div>

          {/* Scan selector */}
          {scans.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {scans.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScan(s)}
                  className={`flex-shrink-0 px-2 py-1 rounded text-xs transition ${
                    selectedScan?.id === s.id
                      ? "bg-green-900/50 text-green-400 border border-green-800"
                      : "bg-neutral-900 text-neutral-500 border border-neutral-800"
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
      </div>

      {/* No scans */}
      {scans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-neutral-500 text-sm mb-4">No scans yet. Run your first scan to discover juicy CSPs.</p>
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg"
          >
            {scanning ? "Scanning..." : "🎯 Run First Scan"}
          </button>
        </div>
      )}

      {selectedScan && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-px bg-neutral-800 border-b border-neutral-800">
            {[
              { label: "Candidates", value: candidates.length, color: "text-white" },
              { label: "High Priority", value: candidates.filter((c) => c.priority === "high").length, color: "text-green-400" },
              { label: "Top AROC", value: `${candidates[0]?.aroc ?? 0}%`, color: "text-yellow-400" },
              { label: "Delta Changes", value: totalDeltaChanges, color: "text-blue-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-black px-3 py-2 text-center">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Delta section */}
          {delta && totalDeltaChanges > 0 && (
            <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3">
              <h2 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
                Changes Since Last Scan
              </h2>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {delta.premium_increased?.slice(0, 3).map((d, i) => (
                  <div key={`up-${i}`} className="text-xs text-green-400">📈 {d.message}</div>
                ))}
                {delta.new?.slice(0, 3).map((d, i) => (
                  <div key={`new-${i}`} className="text-xs text-blue-400">🆕 {d.message}</div>
                ))}
                {delta.support_lost?.slice(0, 2).map((d, i) => (
                  <div key={`sl-${i}`} className="text-xs text-red-400">⚠️ {d.message}</div>
                ))}
                {delta.dropped?.slice(0, 2).map((d, i) => (
                  <div key={`dr-${i}`} className="text-xs text-neutral-500">❌ {d.message}</div>
                ))}
              </div>
            </div>
          )}

          {/* Claude Analysis toggle */}
          {selectedScan.claudeAnalysis && (
            <div className="border-b border-neutral-800">
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-neutral-950 transition"
              >
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  🤖 Claude Risk Analysis
                </span>
                <span className="text-neutral-500 text-xs">{showAnalysis ? "▲" : "▼"}</span>
              </button>
              {showAnalysis && (
                <div className="px-4 pb-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap bg-purple-950/10">
                  {selectedScan.claudeAnalysis}
                </div>
              )}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-neutral-800">
            {(["all", "high", "medium"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filter === f
                    ? "bg-green-900/50 text-green-400"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {f === "all" ? `All (${candidates.length})` : f === "high" ? `High (${candidates.filter((c) => c.priority === "high").length})` : `Medium (${candidates.filter((c) => c.priority === "medium").length})`}
              </button>
            ))}
          </div>

          {/* Candidate cards */}
          <div className="divide-y divide-neutral-800/50">
            {filtered.map((c, i) => (
              <CandidateCard key={`${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-neutral-500 text-sm">
              No {filter} priority candidates in this scan.
            </div>
          )}
        </>
      )}

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-black border-t border-neutral-800 px-4 py-2">
        <div className="flex justify-around">
          <Link href="/today" className="text-xs text-neutral-500 hover:text-white transition py-1">
            Plays
          </Link>
          <Link href="/csp-hunter" className="text-xs text-green-400 font-semibold py-1">
            CSP Hunter
          </Link>
          <Link href="/watchlists" className="text-xs text-neutral-500 hover:text-white transition py-1">
            Watchlists
          </Link>
          <Link href="/research" className="text-xs text-neutral-500 hover:text-white transition py-1">
            Research
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Card
// ---------------------------------------------------------------------------

function CandidateCard({ candidate: c, rank }: { candidate: Candidate; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColors = {
    high: "bg-green-500",
    medium: "bg-yellow-500",
    low: "bg-neutral-600",
  };

  return (
    <div
      className="px-4 py-3 hover:bg-neutral-950/50 transition cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-neutral-600 text-xs w-5">{rank}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityColors[c.priority]}`} />
          <Link
            href={`/ticker/${c.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-white hover:text-green-400 transition"
          >
            {c.symbol}
          </Link>
          <span className="text-xs text-neutral-500">
            ${c.strike} P · {c.expiry.slice(5)} · {c.dte}d
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-green-400">{c.aroc}%</div>
          <div className="text-[10px] text-neutral-500">AROC</div>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="flex items-center gap-3 mt-1.5 ml-7">
        <span className="text-xs text-neutral-400">${c.mid.toFixed(2)} mid</span>
        <span className="text-xs text-neutral-500">Δ{c.delta.toFixed(2)}</span>
        <span className="text-xs text-neutral-500">{c.distanceFromPrice}% OTM</span>
        <span className="text-xs text-neutral-500">IV {(c.iv * 100).toFixed(0)}%</span>
        <span className={`text-xs ${c.juiciness >= 70 ? "text-green-400" : c.juiciness >= 50 ? "text-yellow-400" : "text-neutral-500"}`}>
          {c.juiciness}/100
        </span>
      </div>

      {/* Badges */}
      <div className="flex gap-1.5 mt-1.5 ml-7">
        {c.earningsWithinDTE && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
            ⚠ Earnings {c.daysToEarnings}d
          </span>
        )}
        {c.nearSupport && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">
            ✓ Near support
          </span>
        )}
        {c.rsi < 35 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">
            RSI oversold
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 ml-7 p-3 bg-neutral-900 rounded-lg text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-400">
            <div>Current Price: <span className="text-white">${c.currentPrice.toFixed(2)}</span></div>
            <div>Strike: <span className="text-white">${c.strike.toFixed(2)}</span></div>
            <div>Bid/Ask: <span className="text-white">${c.bid.toFixed(2)} / ${c.ask.toFixed(2)}</span></div>
            <div>Premium: <span className="text-green-400">${c.premium.toFixed(0)}</span></div>
            <div>Collateral: <span className="text-white">${c.collateralRequired.toLocaleString()}</span></div>
            <div>Contracts @ $100K: <span className="text-white">{c.contractsAt100k}</span></div>
            <div>Total Premium: <span className="text-green-400">${c.totalPremium.toLocaleString()}</span></div>
            <div>Capital Used: <span className="text-white">{c.capitalUtilization}%</span></div>
            <div>OI: <span className="text-white">{c.openInterest.toLocaleString()}</span></div>
            <div>Volume: <span className="text-white">{c.volume.toLocaleString()}</span></div>
            <div>RSI: <span className="text-white">{c.rsi}</span></div>
            <div>Tech Score: <span className="text-white">{c.technicalScore}/100</span></div>
            {c.supportLevel > 0 && (
              <div>Support: <span className="text-white">${c.supportLevel.toFixed(2)}</span></div>
            )}
            {c.earningsDate && (
              <div>Earnings: <span className="text-yellow-400">{c.earningsDate}</span></div>
            )}
          </div>
          <div className="pt-2 border-t border-neutral-800 text-neutral-300">
            {c.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}
