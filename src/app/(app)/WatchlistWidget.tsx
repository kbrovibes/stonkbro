"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { cachedFetchJson } from "@/lib/client-cache";

interface Ticker {
  symbol: string;
  price: number;
  changePct: number;
}

interface Watchlist {
  id: string;
  name: string;
  tickers: Ticker[];
}

const COLLAPSE_LIMIT = 8;

// Common tickers for autocomplete
const ALL_TICKERS = [
  "AAPL","ABNB","AEHR","AFRM","AI","AMD","AMZN","ANET","ARM","ARQQ","ASTS",
  "AVGO","AXON","BA","BABA","BEAM","BILL","BLNK","BKNG","CAT","CCJ","CEG",
  "CELH","CFLT","CHPT","COIN","COST","CRDO","CRSP","CRWD","DAL","DDOG",
  "DIS","DNA","DNN","EXPE","F","GE","GKOS","GM","GOOG","GOOGL","GS",
  "HIMS","HOOD","INTC","IONQ","JPM","KTOS","LAZR","LCID","LEU","LHX",
  "LIDR","LLY","LULU","LUNR","MA","MDB","MELI","META","MRNA","MRVL",
  "MSFT","MSTR","MU","NET","NFLX","NIO","NNE","NU","NVDA","OKLO",
  "ORCL","PATH","PLTR","PYPL","QBTS","QCOM","QS","QUBT","RDDT","RDW",
  "RGTI","RIVN","RKLB","ROKU","RXRX","S","SDGR","SHOP","SMCI","SMR",
  "SNAP","SNOW","SOFI","SPOT","SQ","TEM","TGT","TOST","TSLA","TSM",
  "UBER","UEC","UNH","UPST","UUUU","V","VERV","VRT","VST","WMT","ZS",
];

function groupReturn(tickers: Ticker[]): number | null {
  if (tickers.length === 0) return null;
  return tickers.reduce((sum, t) => sum + t.changePct, 0) / tickers.length;
}

// ---------------------------------------------------------------------------
// Sparkline SVG
// ---------------------------------------------------------------------------

function Sparkline({ data, up, width = 36, height = 16 }: { data: number[]; up: boolean; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Inline Add with Autocomplete
// ---------------------------------------------------------------------------

function InlineAdd({
  watchlistId,
  existingSymbols,
  onAdded,
  onClose,
}: {
  watchlistId: string;
  existingSymbols: Set<string>;
  onAdded: (ticker: Ticker) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }
    const q = query.toUpperCase().trim();
    const matches = ALL_TICKERS
      .filter((t) => t.includes(q) && !existingSymbols.has(t))
      .sort((a, b) => {
        // Prefer prefix matches
        const aStart = a.startsWith(q) ? 0 : 1;
        const bStart = b.startsWith(q) ? 0 : 1;
        return aStart - bStart || a.localeCompare(b);
      })
      .slice(0, 5);
    // Always allow adding whatever the user typed (any ticker, e.g. "P").
    // Prepend it as an explicit option if it's a valid-looking symbol
    // (1-5 alphanumeric chars) and isn't already a match or already in the list.
    const isValidSymbol = /^[A-Z][A-Z0-9.\-]{0,5}$/.test(q);
    if (isValidSymbol && !matches.includes(q) && !existingSymbols.has(q)) {
      setSuggestions([q, ...matches.slice(0, 4)]);
    } else {
      setSuggestions(matches);
    }
  }, [query, existingSymbols]);

  async function addTicker(symbol: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/watchlists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistId, symbol }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      onAdded(data.ticker);
      setQuery("");
      setSuggestions([]);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim()) {
      addTicker(query.trim().toUpperCase());
    }
    if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        placeholder="TICKER"
        disabled={saving}
        className="w-16 px-1.5 py-0.5 rounded border border-sky-300 bg-white dark:bg-surface-elevated text-[10px] font-bold text-stone-900 dark:text-text placeholder:text-stone-300 focus:outline-none focus:border-sky-500 disabled:opacity-50"
      />
      {saving && <span className="text-[9px] text-stone-400 dark:text-text-faint">...</span>}

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute top-6 left-0 z-20 w-32 rounded-lg bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default shadow-lg py-1">
          {suggestions.map((s, i) => {
            const typedQ = query.toUpperCase().trim();
            const isTypedExact = i === 0 && s === typedQ && !ALL_TICKERS.includes(s);
            return (
              <button
                key={s}
                onClick={() => addTicker(s)}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  isTypedExact
                    ? "text-sky-700 dark:text-accent-hover hover:bg-sky-100 border-b border-stone-100 dark:border-border-subtle"
                    : "text-stone-800 dark:text-text hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                {isTypedExact ? `Add "${s}" →` : s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export default function WatchlistWidget({ watchlists: initial }: { watchlists: Watchlist[] }) {
  const [watchlists, setWatchlists] = useState(initial);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  // Fetch sparklines for all tickers on mount — cached for fast navigation
  const fetchSparklines = useCallback(async () => {
    const allSymbols = [...new Set(initial.flatMap((wl) => wl.tickers.map((t) => t.symbol)))];
    if (allSymbols.length === 0) return;
    try {
      const url = `/api/sparklines?symbols=${allSymbols.join(",")}`;
      const data = await cachedFetchJson<{ sparklines?: Record<string, number[]> }>(url, { ttlMs: 5 * 60_000 });
      setSparklines(data.sparklines || {});
    } catch {
      // silent
    }
  }, [initial]);

  useEffect(() => {
    fetchSparklines();
  }, [fetchSparklines]);

  function handleAdded(wlId: string, ticker: Ticker) {
    setWatchlists((prev) =>
      prev.map((wl) =>
        wl.id === wlId ? { ...wl, tickers: [...wl.tickers, ticker] } : wl
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {watchlists.map((wl) => {
        const avgReturn = groupReturn(wl.tickers);
        const isExpanded = expanded[wl.id] ?? false;
        const needsCollapse = wl.tickers.length > COLLAPSE_LIMIT;
        const visibleTickers = needsCollapse && !isExpanded
          ? wl.tickers.slice(0, COLLAPSE_LIMIT)
          : wl.tickers;
        const hiddenCount = wl.tickers.length - COLLAPSE_LIMIT;
        const existingSymbols = new Set(wl.tickers.map((t) => t.symbol));

        return (
          <div key={wl.id}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-800 dark:text-text">{wl.name}</span>
                {avgReturn !== null && (
                  <span className={`text-[10px] font-bold tabular-nums ${
                    avgReturn >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"
                  }`}>
                    {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {addingTo === wl.id ? (
                  <>
                    <InlineAdd
                      watchlistId={wl.id}
                      existingSymbols={existingSymbols}
                      onAdded={(ticker) => handleAdded(wl.id, ticker)}
                      onClose={() => setAddingTo(null)}
                    />
                    <button
                      onClick={() => setAddingTo(null)}
                      className="text-[10px] text-stone-400 dark:text-text-faint hover:text-stone-600"
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAddingTo(wl.id)}
                    className="text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
                  >
                    + Add
                  </button>
                )}
                <Link
                  href={`/watchlists/${wl.id}`}
                  className="text-[10px] font-medium text-stone-400 dark:text-text-faint hover:text-stone-600 transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>

            {/* Ticker cards */}
            {wl.tickers.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  {visibleTickers.map((t) => {
                    const up = t.changePct >= 0;
                    return (
                      <Link
                        key={t.symbol}
                        href={`/ticker/${t.symbol}`}
                        className={`rounded-lg p-2 transition-all hover:scale-[1.02] active:scale-95 ${
                          up ? "bg-emerald-50 dark:bg-gain-bg hover:bg-emerald-100/80" : "bg-red-50 dark:bg-loss-bg hover:bg-red-100/80"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-[11px] font-extrabold text-stone-900 dark:text-text leading-none">{t.symbol}</div>
                            <div className="text-[10px] text-stone-500 dark:text-text-subtle tabular-nums mt-0.5">
                              ${t.price < 1000 ? t.price.toFixed(2) : t.price.toFixed(0)}
                            </div>
                          </div>
                          {sparklines[t.symbol]?.length > 1 && (
                            <Sparkline data={sparklines[t.symbol]} up={up} />
                          )}
                        </div>
                        <div className={`text-[10px] font-bold tabular-nums mt-0.5 ${
                          up ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"
                        }`}>
                          {up ? "+" : ""}{t.changePct.toFixed(1)}%
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Show more / less */}
                {needsCollapse && (
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [wl.id]: !isExpanded }))}
                    className="mt-1.5 text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
                  >
                    {isExpanded ? "Show less" : `+${hiddenCount} more`}
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-stone-200 dark:border-border-default px-4 py-3 text-center">
                <span className="text-[11px] text-stone-400 dark:text-text-faint">No tickers yet</span>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
