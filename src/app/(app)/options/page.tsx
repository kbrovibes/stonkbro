"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Pick {
  symbol: string;
  rationale: string;
  action: string;
  strike: number;
  expiry: string;
  dte: number;
  premium: number;
  annualizedReturn: string;
  marginOfSafety: string;
  price?: number;
  changePct?: number;
}

interface ThemeResult {
  theme: string;
  picks: Pick[];
  generatedAt: string;
}

interface RunningBatch {
  theme: string;
  status: string;
}

export default function OptionsPage() {
  const [data, setData] = useState<ThemeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const res = await fetch("/api/recommendations?theme=top_csp_picks");
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      
      if (json.recommendation) {
        setData(json.recommendation);
      }
      
      // If it's still running, poll
      const isStillRunning = json.running?.some((r: RunningBatch) => r.theme === "top_csp_picks");
      if (isStillRunning) {
        setTimeout(() => {
          fetchData(true).catch(console.error);
        }, 5000);
      } else if (isRefresh) {
        setRefreshing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setRefreshing(false);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(console.error);
  }, [fetchData]);

  const handleRegenerate = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start regeneration");
      // Start polling
      setTimeout(() => {
        fetchData(true).catch(console.error);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start refresh");
      setRefreshing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-10">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-stone-500 font-medium">Analyzing market for CSP picks...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Options Research</h1>
          <p className="text-xs text-stone-500 mt-0.5">Top 10 Cash-Secured Puts for Today</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={refreshing}
          className={`p-2 rounded-lg border border-stone-200 transition-all ${
            refreshing ? "opacity-50 cursor-not-allowed" : "hover:bg-stone-50 active:scale-95"
          }`}
          title="Regenerate Picks"
        >
          <svg className={`w-5 h-5 text-stone-600 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {data ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Scanned: {new Date(data.generatedAt).toLocaleString()}
            </span>
            {refreshing && (
              <span className="text-[10px] font-bold text-sky-600 animate-pulse">
                REFRESHING...
              </span>
            )}
          </div>

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
                  {data.picks.map((pick, idx) => (
                    <tr key={`${pick.symbol}-${idx}`} className="group hover:bg-stone-50/50 transition-colors">
                      <td className="px-3 py-3">
                        <Link href={`/ticker/${pick.symbol}`} className="block">
                          <span className="text-xs font-bold text-stone-900 group-hover:text-sky-600 transition-colors">{pick.symbol}</span>
                          {pick.price && (
                            <div className="text-[9px] text-stone-400 font-medium">${pick.price.toFixed(2)}</div>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs font-medium text-stone-600">{pick.dte}d</td>
                      <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">
                        ${pick.strike.toFixed(2)}
                        <div className="text-[9px] text-stone-400 font-medium">{pick.marginOfSafety} OTM</div>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-emerald-600 text-right">${pick.premium.toFixed(2)}</td>
                      <td className="px-3 py-3 text-xs font-bold text-stone-900 text-right">{pick.annualizedReturn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <h3 className="text-xs font-bold text-stone-900 px-1">Deep Analysis</h3>
            <div className="grid gap-3">
              {data.picks.map((pick, idx) => (
                <div key={`rationale-${pick.symbol}-${idx}`} className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-stone-900">{pick.symbol}</span>
                    <span className="text-[10px] font-medium text-stone-500">Sell ${pick.strike} Put</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {pick.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
          <p className="text-sm text-stone-400 font-medium">No CSP picks found. Try regenerating.</p>
        </div>
      )}
      
      <div className="h-20" /> {/* Spacer for BottomNav */}
    </div>
  );
}
