"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const POPULAR = ["NVDA", "AAPL", "TSLA", "PLTR", "AMD", "META", "MSFT", "AMZN"];

// --- Chip ticker input ---
function TickerChipInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tickers: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTicker = useCallback(
    (raw: string) => {
      const upper = raw.trim().toUpperCase().replace(/[^A-Z]/g, "");
      if (!upper || value.includes(upper)) {
        setDraft("");
        return;
      }
      onChange([...value, upper]);
      setDraft("");
    },
    [value, onChange]
  );

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTicker(draft);
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const parts = e.clipboardData.getData("text").split(/[\s,]+/);
    const newTickers = parts
      .map((p) => p.trim().toUpperCase().replace(/[^A-Z]/g, ""))
      .filter((p) => p && !value.includes(p));
    if (newTickers.length) onChange([...value, ...newTickers]);
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[48px] px-3 py-2 rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white text-xs font-bold"
        >
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== t)); }}
            className="text-stone-400 dark:text-text-faint hover:text-white ml-0.5 leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={handleKey}
        onPaste={handlePaste}
        onBlur={() => { if (draft) addTicker(draft); }}
        placeholder={value.length === 0 ? "AAPL, TSLA, NVDA..." : ""}
        className="flex-1 min-w-[80px] text-sm font-medium text-stone-900 dark:text-text placeholder:text-stone-400 outline-none bg-transparent"
      />
    </div>
  );
}

// --- Mini suggestion card for one ticker ---
function TickerSuggestionCard({ symbol }: { symbol: string }) {
  return (
    <Link
      href={`/suggestions/${symbol}`}
      className="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-surface-muted flex items-center justify-center text-sm font-bold text-stone-700 dark:text-text-muted">
          {symbol.slice(0, 2)}
        </span>
        <div>
          <p className="text-sm font-bold text-stone-900 dark:text-text">{symbol}</p>
          <p className="text-xs text-stone-400 dark:text-text-faint">Tap to see CSP · CC · PMCC</p>
        </div>
      </div>
      <svg className="w-4 h-4 text-stone-300 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

export default function SuggestionsPage() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tickers.length === 1) {
      window.location.href = `/suggestions/${tickers[0]}`;
      return;
    }
    if (tickers.length > 1) {
      setSubmitted(tickers);
    }
  }

  function addPopular(ticker: string) {
    if (!tickers.includes(ticker)) setTickers((prev) => [...prev, ticker]);
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-text">Options Suggestions</h2>
        <p className="text-sm text-stone-500 dark:text-text-subtle mt-0.5">
          Get CSP, Covered Call, and PMCC recommendations — one ticker or many
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <TickerChipInput value={tickers} onChange={setTickers} />
        <p className="text-[11px] text-stone-400 dark:text-text-faint">
          Press Enter, comma, or Space to add each ticker. Paste a list to add many at once.
        </p>
        <button
          type="submit"
          disabled={tickers.length === 0}
          className="w-full py-3 rounded-xl bg-stone-900 dark:bg-surface-elevated text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
        >
          {tickers.length === 0
            ? "Add tickers above"
            : tickers.length === 1
            ? `Analyze ${tickers[0]}`
            : `Analyze ${tickers.length} tickers`}
        </button>
      </form>

      {/* Results for multiple tickers */}
      {submitted.length > 1 && (
        <div>
          <h3 className="text-xs font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wider mb-3">
            Analysis Queue — tap to view each
          </h3>
          <div className="flex flex-col gap-2">
            {submitted.map((sym) => (
              <TickerSuggestionCard key={sym} symbol={sym} />
            ))}
          </div>
        </div>
      )}

      {/* Popular tickers */}
      {submitted.length === 0 && (
        <div>
          <h3 className="text-xs font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wider mb-3">
            Popular Tickers
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((ticker) => (
              <button
                key={ticker}
                onClick={() => addPopular(ticker)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                  tickers.includes(ticker)
                    ? "border-stone-900 bg-stone-900 dark:bg-surface-elevated text-white"
                    : "border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated text-stone-700 dark:text-text-muted hover:border-stone-300"
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
