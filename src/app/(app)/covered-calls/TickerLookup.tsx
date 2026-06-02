"use client";

import { useState, useTransition } from "react";
import { lookupTicker } from "./actions";

type Candidate = {
  strike: number;
  expiry: string;
  dte: number;
  premium: number;
  annualizedReturn: number;
  probOTM: number;
  maxProfit: number;
};

type LookupResult = {
  symbol: string;
  currentPrice: number;
  candidates: Candidate[];
  error?: string;
};

function formatDollar(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function TickerLookup() {
  const [symbol, setSymbol] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) return;

    startTransition(async () => {
      const data = await lookupTicker(symbol.trim().toUpperCase(), parseFloat(costBasis) || 0);
      setResult(data);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider font-semibold">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="w-24 px-3 py-2 text-sm font-semibold text-stone-900 dark:text-text rounded-lg border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider font-semibold">Cost Basis</label>
          <input
            type="number"
            step="0.01"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            placeholder="0.00"
            className="w-28 px-3 py-2 text-sm text-stone-900 dark:text-text rounded-lg border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !symbol.trim()}
          className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 dark:bg-surface-elevated hover:bg-stone-800 dark:hover:bg-surface-muted disabled:bg-stone-300 rounded-lg transition-colors"
        >
          {isPending ? "Loading..." : "Analyze"}
        </button>
      </form>

      {result?.error && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">{result.error}</p>
        </div>
      )}

      {result && !result.error && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-stone-900 dark:text-text">{result.symbol}</span>
            <span className="text-sm font-semibold text-stone-700 dark:text-text-muted">{formatDollar(result.currentPrice)}</span>
          </div>

          {result.candidates.length === 0 && (
            <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
              <p className="text-xs text-stone-500 dark:text-text-subtle">No covered call candidates found in the 3-10% OTM, 20-45 DTE range.</p>
            </div>
          )}

          {result.candidates.length > 0 && (
            <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated overflow-hidden">
              <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-stone-50 dark:bg-surface border-b border-stone-100 dark:border-border-subtle text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wider">
                <span>Strike</span>
                <span>Premium</span>
                <span>Prob OTM</span>
                <span>Ann. Ret.</span>
                <span>Max Profit</span>
              </div>

              {result.candidates.map((opt, i) => {
                const prevExpiry = i > 0 ? result.candidates[i - 1].expiry : null;
                const showDivider = prevExpiry && prevExpiry !== opt.expiry;

                return (
                  <div key={`${opt.strike}-${opt.expiry}`}>
                    {showDivider && <div className="border-t-2 border-stone-200 dark:border-border-default" />}
                    <div className="grid grid-cols-5 gap-1 px-3 py-2.5 border-b border-stone-50 dark:border-border-subtle hover:bg-stone-50/50 dark:hover:bg-surface-muted/50 transition-colors items-center">
                      <div>
                        <span className="text-xs font-bold text-stone-900 dark:text-text">${opt.strike}</span>
                        <span className="text-[10px] text-stone-400 dark:text-text-faint block">{opt.expiry} · {opt.dte}d</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-gain-strong">${opt.premium.toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-1.5 bg-stone-100 dark:bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${opt.probOTM >= 75 ? "bg-emerald-500" : opt.probOTM >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                            style={{ width: `${opt.probOTM}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-stone-500 dark:text-text-subtle">{opt.probOTM}%</span>
                      </div>
                      <span className={`text-xs font-semibold ${opt.annualizedReturn >= 20 ? "text-emerald-700 dark:text-gain-strong" : opt.annualizedReturn >= 10 ? "text-amber-600 dark:text-amber-300" : "text-stone-500 dark:text-text-subtle"}`}>
                        {opt.annualizedReturn.toFixed(1)}%
                      </span>
                      <span className="text-xs text-stone-700 dark:text-text-muted">{formatDollar(opt.maxProfit)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
