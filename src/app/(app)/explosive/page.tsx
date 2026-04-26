"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Pick = {
  symbol: string;
  thesis: string;
  catalyst: string;
  risk: string;
  entryStrategy: string;
  conviction: string;
};

type Result = {
  report: string;
  picks: Pick[];
  sector: string;
  tickersAnalyzed: string[];
  timestamp: string;
};

const SECTORS = [
  { slug: "all", name: "All Sectors" },
  { slug: "ai-infrastructure", name: "AI Infrastructure" },
  { slug: "ai-software", name: "AI Software & Applications" },
  { slug: "quantum", name: "Quantum Computing" },
  { slug: "nuclear-energy", name: "Nuclear & Clean Energy" },
  { slug: "space-defense", name: "Space & Defense" },
  { slug: "fintech", name: "Fintech & Digital Finance" },
  { slug: "biotech", name: "Biotech & Healthcare Innovation" },
  { slug: "ev-autonomy", name: "EV & Autonomous Vehicles" },
];

function convictionColor(conviction: string) {
  switch (conviction) {
    case "High":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Low":
      return "bg-stone-100 text-stone-600 border-stone-200";
    default:
      return "bg-stone-100 text-stone-600 border-stone-200";
  }
}

function strategyColor(strategy: string) {
  if (strategy.includes("CSP")) return "bg-sky-100 text-sky-700 border-sky-200";
  if (strategy.includes("PMCC")) return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

// Simple markdown renderer matching research page pattern
function MarkdownReport({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-extrabold text-stone-900 mt-5 mb-2">
          {line.replace(/^###\s*/, "")}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-extrabold text-stone-900 mt-6 mb-2 pb-1 border-b border-stone-200">
          {line.replace(/^##\s*/, "")}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-extrabold text-stone-900 mt-6 mb-3">
          {line.replace(/^#\s*/, "")}
        </h1>
      );
    } else if (line.match(/\*\*(.+?)\*\*/)) {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let key = 0;
      while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) parts.push(remaining.substring(0, boldMatch.index));
          parts.push(<span key={key++} className="font-semibold text-stone-900">{boldMatch[1]}</span>);
          remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
        } else {
          parts.push(remaining);
          break;
        }
      }
      const isListItem = line.match(/^\s*-\s/);
      elements.push(
        <p key={i} className={`text-sm text-stone-700 leading-relaxed ${isListItem ? "pl-3" : ""}`}>
          {parts}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-stone-700 leading-relaxed">
          {line}
        </p>
      );
    }
  }

  return <div className="space-y-0">{elements}</div>;
}

export default function ExplosivePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center flex-1 py-20"><span className="text-sm text-stone-400">Loading...</span></div>}>
      <ExplosivePage />
    </Suspense>
  );
}

function ExplosivePage() {
  const searchParams = useSearchParams();
  const sectorParam = searchParams.get("sector");

  const [selectedSector, setSelectedSector] = useState(sectorParam || "all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showReport, setShowReport] = useState(true);

  // Auto-run if sector param provided
  useEffect(() => {
    if (sectorParam && sectorParam !== "all") {
      setSelectedSector(sectorParam);
    }
  }, [sectorParam]);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/explosive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector: selectedSector === "all" ? undefined : selectedSector,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const data: Result = await res.json();
      setResult(data);
      setShowReport(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div>
        <h2 className="text-lg font-extrabold text-stone-900">Find Explosive Stocks</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          AI-powered search for 10x potential opportunities
        </p>
      </div>

      {/* Sector selector */}
      <div className="flex flex-col gap-3">
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:border-stone-400 appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.5rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.5em 1.5em",
          }}
        >
          {SECTORS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
              </svg>
              Find Explosive Stocks
            </>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-stone-600 font-medium">
              Analyzing sector for 10x opportunities...
            </span>
          </div>
          <p className="text-xs text-stone-400 text-center max-w-xs">
            Fetching live market data, evaluating growth potential, catalysts, and optimal entry strategies. This usually takes 30-60 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700 font-medium">Analysis failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Meta */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                {result.sector}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {new Date(result.timestamp).toLocaleString()} — {result.tickersAnalyzed.length} tickers analyzed
              </p>
            </div>
            <button
              onClick={() => setShowReport(!showReport)}
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              {showReport ? "Hide Report" : "Show Report"}
            </button>
          </div>

          {/* Report */}
          {showReport && result.report && (
            <div className="rounded-xl border border-stone-200 bg-white p-5">
              <MarkdownReport content={result.report} />
            </div>
          )}

          {/* Picks */}
          {result.picks.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Explosive Picks ({result.picks.length})
              </p>
              {result.picks.map((pick, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/ticker/${pick.symbol}`}
                        className="text-sm font-bold text-stone-900 hover:text-sky-700 transition-colors"
                      >
                        {pick.symbol}
                      </Link>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${convictionColor(pick.conviction)}`}
                      >
                        {pick.conviction} Conviction
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${strategyColor(pick.entryStrategy)}`}
                    >
                      {pick.entryStrategy}
                    </span>
                  </div>

                  {/* Thesis */}
                  <div className="mb-2.5">
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
                      10x Thesis
                    </p>
                    <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 rounded-lg px-3 py-2">
                      {pick.thesis}
                    </p>
                  </div>

                  {/* Catalyst */}
                  <div className="mb-2.5">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">
                      Catalyst
                    </p>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {pick.catalyst}
                    </p>
                  </div>

                  {/* Risk */}
                  <div>
                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">
                      Key Risk
                    </p>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {pick.risk}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            Find your next 10x
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">
            Select a sector and let AI analyze live market data to find stocks with explosive growth potential and optimal entry strategies.
          </p>
        </div>
      )}
    </div>
  );
}
