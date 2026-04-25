"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RECENT_TICKERS = ["NVDA", "AAPL", "TSLA", "PLTR", "AMD"];

export default function SuggestionsPage() {
  const [symbol, setSymbol] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = symbol.trim().toUpperCase();
    if (trimmed) {
      router.push(`/suggestions/${trimmed}`);
    }
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-stone-900">Options Suggestions</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Get CSP, Covered Call, and PMCC recommendations for any ticker
        </p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter ticker symbol..."
          className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm font-medium placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
        />
        <button
          type="submit"
          disabled={!symbol.trim()}
          className="px-5 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
        >
          Analyze
        </button>
      </form>

      {/* Recent tickers */}
      <div>
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
          Popular Tickers
        </h3>
        <div className="flex flex-col gap-2">
          {RECENT_TICKERS.map((ticker) => (
            <Link
              key={ticker}
              href={`/suggestions/${ticker}`}
              className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-700">
                  {ticker.slice(0, 2)}
                </span>
                <span className="text-sm font-bold text-stone-900">{ticker}</span>
              </div>
              <svg
                className="w-4 h-4 text-stone-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
