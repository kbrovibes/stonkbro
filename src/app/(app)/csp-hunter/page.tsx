"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AIModelBadge } from "@/components/AIModelBadge";

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

type Tab = "csp" | "calls" | "leaps";

export default function OptionsScannerPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [tab, setTab] = useState<Tab>("csp");

  const fetchScans = useCallback(async (selectLatest = false) => {
    try {
      const res = await fetch("/api/csp-hunter");
      if (!res.ok) return;
      const data = await res.json();
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
        <p className="text-stone-400 text-sm animate-pulse">Loading Options Scanner...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-stone-900">Options Scanner</h1>
                <AIModelBadge />
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                CSPs + Call buys · $100K capital · Top picks by profit potential
              </p>
            </div>
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white text-xs font-semibold rounded-lg transition"
            >
              {scanning ? "Scanning..." : "Run Scan"}
            </button>
          </div>

          {scans.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {scans.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScan(s)}
                  className={`flex-shrink-0 px-2 py-1 rounded text-xs transition ${
                    selectedScan?.id === s.id
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-stone-50 text-stone-500 border border-stone-200"
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
          <p className="text-stone-400 text-sm mb-4">No scans yet. Run your first scan to find options plays.</p>
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
          {/* Tab switcher */}
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setTab("csp")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${
                tab === "csp"
                  ? "text-emerald-600 border-b-2 border-emerald-600"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              CSPs ({candidates.length})
            </button>
            <button
              onClick={() => setTab("calls")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${
                tab === "calls"
                  ? "text-sky-600 border-b-2 border-sky-600"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              Calls ({callCandidates.length})
            </button>
            <button
              onClick={() => setTab("leaps")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${
                tab === "leaps"
                  ? "text-violet-600 border-b-2 border-violet-600"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              LEAPS ({leapsCandidates.length})
            </button>
          </div>

          {/* CSP tab */}
          {tab === "csp" && (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-px bg-stone-200 border-b border-stone-200">
                {[
                  { label: "CSP Picks", value: candidates.length, color: "text-stone-900" },
                  { label: "Top AROC", value: `${candidates[0]?.aroc ?? 0}%`, color: "text-emerald-600" },
                  { label: "Delta Changes", value: totalDeltaChanges, color: "text-sky-600" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white px-3 py-2 text-center">
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Delta section */}
              {delta && totalDeltaChanges > 0 && (
                <div className="border-b border-stone-200 bg-amber-50/50 px-4 py-3">
                  <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                    Changes Since Last Scan
                  </h2>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {delta.premium_increased?.slice(0, 3).map((d, i) => (
                      <div key={`up-${i}`} className="text-xs text-emerald-700">{d.message}</div>
                    ))}
                    {delta.new?.slice(0, 3).map((d, i) => (
                      <div key={`new-${i}`} className="text-xs text-sky-700">{d.message}</div>
                    ))}
                    {delta.support_lost?.slice(0, 2).map((d, i) => (
                      <div key={`sl-${i}`} className="text-xs text-red-600">{d.message}</div>
                    ))}
                    {delta.dropped?.slice(0, 2).map((d, i) => (
                      <div key={`dr-${i}`} className="text-xs text-stone-500">{d.message}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claude Analysis */}
              {selectedScan.claudeAnalysis && (
                <div className="border-b border-stone-200">
                  <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-stone-50 transition"
                  >
                    <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
                      Claude Risk Analysis
                    </span>
                    <span className="text-stone-400 text-xs">{showAnalysis ? "hide" : "show"}</span>
                  </button>
                  {showAnalysis && (
                    <div className="px-4 pb-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap bg-violet-50/30">
                      {selectedScan.claudeAnalysis}
                    </div>
                  )}
                </div>
              )}

              {/* CSP cards */}
              <div className="divide-y divide-stone-100">
                {candidates.map((c, i) => (
                  <CSPCard key={`${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
                ))}
              </div>

              {candidates.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No CSP candidates in this scan.
                </div>
              )}
            </>
          )}

          {/* Calls tab */}
          {tab === "calls" && (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-px bg-stone-200 border-b border-stone-200">
                {[
                  { label: "Call Picks", value: callCandidates.length, color: "text-stone-900" },
                  { label: "Best Score", value: `${callCandidates[0]?.score ?? 0}/100`, color: "text-sky-600" },
                  { label: "Best +10%", value: callCandidates[0] ? `${callCandidates[0].outcome100pct.returnPct > 0 ? "+" : ""}${callCandidates[0].outcome100pct.returnPct}%` : "—", color: "text-emerald-600" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white px-3 py-2 text-center">
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2 bg-sky-50/50 border-b border-stone-200">
                <p className="text-[11px] text-sky-700">
                  60-120 DTE calls · slightly OTM · $100K capital · 1 pick per ticker
                </p>
              </div>

              {/* Call cards */}
              <div className="divide-y divide-stone-100">
                {callCandidates.map((c, i) => (
                  <CallCard key={`${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
                ))}
              </div>

              {callCandidates.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No call candidates in this scan. Run a new scan.
                </div>
              )}
            </>
          )}

          {/* LEAPS tab */}
          {tab === "leaps" && (
            <>
              <div className="grid grid-cols-3 gap-px bg-stone-200 border-b border-stone-200">
                {[
                  { label: "LEAPS Picks", value: leapsCandidates.length, color: "text-stone-900" },
                  { label: "Best Score", value: `${leapsCandidates[0]?.score ?? 0}/100`, color: "text-violet-600" },
                  { label: "Best +10%", value: leapsCandidates[0] ? `${leapsCandidates[0].outcome100pct.returnPct > 0 ? "+" : ""}${leapsCandidates[0].outcome100pct.returnPct}%` : "—", color: "text-emerald-600" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white px-3 py-2 text-center">
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2 bg-violet-50/50 border-b border-stone-200">
                <p className="text-[11px] text-violet-700">
                  6-18 month LEAPS · slightly OTM · $100K capital · 1 pick per ticker
                </p>
              </div>

              <div className="divide-y divide-stone-100">
                {leapsCandidates.map((c, i) => (
                  <CallCard key={`leaps-${c.symbol}-${c.strike}-${c.expiry}`} candidate={c} rank={i + 1} />
                ))}
              </div>

              {leapsCandidates.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No LEAPS candidates in this scan. Run a new scan.
                </div>
              )}
            </>
          )}
        </>
      )}
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
    low: "bg-stone-400",
  };

  return (
    <div
      className="px-4 py-3 hover:bg-stone-50/50 transition cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-stone-300 text-xs w-5">{rank}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityColors[c.priority]}`} />
          <Link
            href={`/ticker/${c.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-stone-900 hover:text-emerald-600 transition"
          >
            {c.symbol}
          </Link>
          <span className="text-xs text-stone-400">
            ${c.strike} P · {c.expiry.slice(5)} · {c.dte}d
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-emerald-600">{c.aroc}%</div>
          <div className="text-[10px] text-stone-400">AROC</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1.5 ml-7">
        <span className="text-xs text-stone-500">${c.mid.toFixed(2)} mid</span>
        <span className="text-xs text-stone-400">{c.contractsAt100k} contracts</span>
        <span className="text-xs text-emerald-600">${c.totalPremium.toLocaleString()} income</span>
      </div>

      {c.catalyst && (
        <p className="text-xs text-stone-500 mt-1.5 ml-7 italic leading-snug">{c.catalyst}</p>
      )}

      {expanded && (
        <div className="mt-3 ml-7 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-stone-500">
            <div>Current Price: <span className="text-stone-900">${c.currentPrice.toFixed(2)}</span></div>
            <div>Strike: <span className="text-stone-900">${c.strike.toFixed(2)}</span></div>
            <div>Bid/Ask: <span className="text-stone-900">${c.bid.toFixed(2)} / ${c.ask.toFixed(2)}</span></div>
            <div>Premium: <span className="text-emerald-600">${c.premium.toFixed(0)}</span></div>
            <div>Collateral: <span className="text-stone-900">${c.collateralRequired.toLocaleString()}</span></div>
            <div>Contracts @ $100K: <span className="text-stone-900">{c.contractsAt100k}</span></div>
            <div>Total Premium: <span className="text-emerald-600">${c.totalPremium.toLocaleString()}</span></div>
            <div>Capital Used: <span className="text-stone-900">{c.capitalUtilization}%</span></div>
            <div>OI: <span className="text-stone-900">{c.openInterest.toLocaleString()}</span></div>
            <div>Volume: <span className="text-stone-900">{c.volume.toLocaleString()}</span></div>
            <div>Delta: <span className="text-stone-900">{c.delta.toFixed(2)}</span></div>
            <div>IV: <span className="text-stone-900">{(c.iv * 100).toFixed(0)}%</span></div>
          </div>
          <div className="pt-2 border-t border-stone-200 text-stone-600">
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
    low: "bg-stone-400",
  };

  return (
    <div
      className="px-4 py-3 hover:bg-stone-50/50 transition cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-stone-300 text-xs w-5">{rank}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityColors[c.priority]}`} />
          <Link
            href={`/ticker/${c.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-stone-900 hover:text-sky-600 transition"
          >
            {c.symbol}
          </Link>
          <span className="text-xs text-stone-400">
            ${c.strike} C · {c.expiry.slice(5)} · {c.dte}d
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-sky-600">{c.score}/100</div>
          <div className="text-[10px] text-stone-400">Score</div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="flex items-center gap-3 mt-1.5 ml-7">
        <span className="text-xs text-stone-500">${c.mid.toFixed(2)} mid</span>
        <span className="text-xs text-stone-400">{c.contractsAt100k} contracts</span>
        <span className="text-xs text-stone-500">${c.totalCost.toLocaleString()} cost</span>
      </div>

      {/* Catalyst */}
      {c.catalyst && (
        <p className="text-xs text-stone-500 mt-1.5 ml-7 italic leading-snug">{c.catalyst}</p>
      )}

      {/* Outcome scenarios — always visible */}
      <div className="mt-2 ml-7 grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100">
          <div className="text-[10px] text-emerald-600 font-medium uppercase">Stock +5%</div>
          <div className={`text-sm font-bold ${c.outcome50pct.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {c.outcome50pct.profit >= 0 ? "+" : ""}${Math.abs(c.outcome50pct.profit).toLocaleString()}
          </div>
          <div className={`text-[10px] ${c.outcome50pct.returnPct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {c.outcome50pct.returnPct >= 0 ? "+" : ""}{c.outcome50pct.returnPct}%
          </div>
        </div>
        <div className="bg-sky-50 rounded-lg p-2 text-center border border-sky-100">
          <div className="text-[10px] text-sky-600 font-medium uppercase">Stock +10%</div>
          <div className={`text-sm font-bold ${c.outcome100pct.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {c.outcome100pct.profit >= 0 ? "+" : ""}${Math.abs(c.outcome100pct.profit).toLocaleString()}
          </div>
          <div className={`text-[10px] ${c.outcome100pct.returnPct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {c.outcome100pct.returnPct >= 0 ? "+" : ""}{c.outcome100pct.returnPct}%
          </div>
        </div>
        <div className="bg-violet-50 rounded-lg p-2 text-center border border-violet-100">
          <div className="text-[10px] text-violet-600 font-medium uppercase">Stock +20%</div>
          <div className="text-sm font-bold text-emerald-700">
            +${c.outcomeHomeRun.profit.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500">
            +{c.outcomeHomeRun.returnPct}%
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 ml-7 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-stone-500">
            <div>Current Price: <span className="text-stone-900">${c.currentPrice.toFixed(2)}</span></div>
            <div>Strike: <span className="text-stone-900">${c.strike.toFixed(2)}</span></div>
            <div>Bid/Ask: <span className="text-stone-900">${c.bid.toFixed(2)} / ${c.ask.toFixed(2)}</span></div>
            <div>Cost/Contract: <span className="text-stone-900">${c.costPerContract.toLocaleString()}</span></div>
            <div>Contracts @ $100K: <span className="text-stone-900 font-semibold">{c.contractsAt100k}</span></div>
            <div>Total Cost: <span className="text-stone-900">${c.totalCost.toLocaleString()}</span></div>
            <div>Capital Used: <span className="text-stone-900">{c.capitalUtilization.toFixed(1)}%</span></div>
            <div>Delta: <span className="text-stone-900">{c.delta.toFixed(2)}</span></div>
            <div>IV: <span className="text-stone-900">{(c.iv * 100).toFixed(0)}%</span></div>
            <div>OTM: <span className="text-stone-900">{c.distanceFromPrice}%</span></div>
            <div>OI: <span className="text-stone-900">{c.openInterest.toLocaleString()}</span></div>
            <div>Volume: <span className="text-stone-900">{c.volume.toLocaleString()}</span></div>
          </div>
          <div className="pt-2 border-t border-stone-200 text-stone-600">
            {c.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}
