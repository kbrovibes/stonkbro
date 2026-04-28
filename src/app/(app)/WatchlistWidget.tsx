"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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
  "AVGO","AXON","BA","BEAM","BILL","BLNK","BKNG","CAT","CCJ","CEG","CELH",
  "CFLT","CHPT","COIN","COST","CRDO","CRSP","CRWD","DAL","DDOG","DIS","DNA",
  "DNN","EXPE","F","GE","GKOS","GM","GOOGL","GS","HIMS","HOOD","IONQ",
  "JPM","KTOS","LAZR","LCID","LEU","LHX","LIDR","LLY","LULU","LUNR",
  "MA","MDB","MELI","META","MRNA","MRVL","MSFT","MSTR","MU","NET",
  "NFLX","NNE","NU","NVDA","OKLO","PATH","PLTR","QBTS","QS","QUBT",
  "RDDT","RDW","RGTI","RIVN","RKLB","RXRX","S","SDGR","SHOP","SMCI",
  "SMR","SNOW","SOFI","SQ","TEM","TGT","TOST","TSLA","TSM","UBER",
  "UEC","UNH","UPST","UUUU","V","VERV","VRT","VST","WMT",
];

function groupReturn(tickers: Ticker[]): number | null {
  if (tickers.length === 0) return null;
  return tickers.reduce((sum, t) => sum + t.changePct, 0) / tickers.length;
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
    const q = query.toUpperCase();
    const matches = ALL_TICKERS
      .filter((t) => t.startsWith(q) && !existingSymbols.has(t))
      .slice(0, 5);
    setSuggestions(matches);
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
    <div className="relative mt-1.5">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Ticker..."
          disabled={saving}
          className="w-20 px-2 py-1 rounded-md border border-stone-200 bg-white text-[11px] font-bold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-sky-400 disabled:opacity-50"
        />
        <button
          onClick={onClose}
          className="text-[10px] text-stone-400 hover:text-stone-600"
        >
          Done
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute top-8 left-0 z-20 w-32 rounded-lg bg-white border border-stone-200 shadow-lg py-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => addTicker(s)}
              className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-stone-800 hover:bg-sky-50 hover:text-sky-700 transition-colors"
            >
              {s}
            </button>
          ))}
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
                <span className="text-xs font-bold text-stone-800">{wl.name}</span>
                {avgReturn !== null && (
                  <span className={`text-[10px] font-bold tabular-nums ${
                    avgReturn >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddingTo(addingTo === wl.id ? null : wl.id)}
                  className="text-[10px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                >
                  {addingTo === wl.id ? "Cancel" : "+ Add"}
                </button>
                <Link
                  href={`/watchlists/${wl.id}`}
                  className="text-[10px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
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
                          up ? "bg-emerald-50 hover:bg-emerald-100/80" : "bg-red-50 hover:bg-red-100/80"
                        }`}
                      >
                        <div className="text-[11px] font-extrabold text-stone-900 leading-none">{t.symbol}</div>
                        <div className="text-[10px] text-stone-500 tabular-nums mt-0.5">
                          ${t.price < 1000 ? t.price.toFixed(2) : t.price.toFixed(0)}
                        </div>
                        <div className={`text-[10px] font-bold tabular-nums mt-0.5 ${
                          up ? "text-emerald-600" : "text-red-500"
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
                    className="mt-1.5 text-[10px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                  >
                    {isExpanded ? "Show less" : `+${hiddenCount} more`}
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-stone-200 px-4 py-3 text-center">
                <span className="text-[11px] text-stone-400">No tickers yet</span>
              </div>
            )}

            {/* Inline add */}
            {addingTo === wl.id && (
              <InlineAdd
                watchlistId={wl.id}
                existingSymbols={existingSymbols}
                onAdded={(ticker) => handleAdded(wl.id, ticker)}
                onClose={() => setAddingTo(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
