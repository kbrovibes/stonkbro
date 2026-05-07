"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { AIModelBadge } from "@/components/AIModelBadge";

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

type TradeSuggestion = {
  id?: string;
  symbol: string;
  strategy: string;
  action: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  reasoning: string;
};

type ResearchEntry = {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  symbols: string[];
  mode: string;
  report?: string;
  suggestions?: TradeSuggestion[];
  timestamp: string;
  error?: string;
  dismissed: Set<number>;
  accepted: Set<number>;
  aiProvider?: string;
  aiModel?: string;
};

function strategyColor(strategy: string) {
  switch (strategy) {
    case "CSP": return "bg-sky-50 text-sky-700 border-sky-200";
    case "CC": return "bg-amber-50 text-amber-700 border-amber-200";
    case "PMCC": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "AVOID": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-stone-100 text-stone-600 border-stone-200";
  }
}

function strategyLabel(strategy: string) {
  switch (strategy) {
    case "CSP": return "Cash-Secured Put";
    case "CC": return "Covered Call";
    case "PMCC": return "Poor Man's CC";
    case "AVOID": return "Avoid";
    default: return strategy;
  }
}

function formatDollar(n: number | undefined) {
  if (n === undefined || n === null) return "--";
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Simple markdown renderer
function MarkdownReport({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  function fmt(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
      const m = remaining.match(/\*\*(.+?)\*\*/);
      if (m && m.index !== undefined) {
        if (m.index > 0) parts.push(remaining.substring(0, m.index));
        parts.push(<span key={key++} className="font-semibold text-stone-900">{m[1]}</span>);
        remaining = remaining.substring(m.index + m[0].length);
      } else { parts.push(remaining); break; }
    }
    return <>{parts}</>;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-sm font-bold text-stone-800 mt-4 mb-1">{line.replace(/^####\s*/, "")}</h4>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-extrabold text-stone-900 mt-5 mb-2">{line.replace(/^###\s*/, "")}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-extrabold text-stone-900 mt-6 mb-2 pb-1 border-b border-stone-200">{line.replace(/^##\s*/, "")}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-extrabold text-stone-900 mt-6 mb-3">{line.replace(/^#\s*/, "")}</h1>);
    } else if (line.match(/^\s*-\s/)) {
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      elements.push(
        <p key={i} className={`text-sm text-stone-600 ${indent > 0 ? "ml-4" : ""} py-0.5 flex`}>
          <span className="text-stone-400 mr-2 shrink-0">-</span>
          <span>{fmt(line.replace(/^\s*-\s*/, ""))}</span>
        </p>
      );
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(<p key={i} className="text-sm text-stone-700 py-0.5">{fmt(line)}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-stone-700 leading-relaxed">{fmt(line)}</p>);
    }
  }
  return <div className="space-y-0">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Ticker chip input with autocomplete
// ---------------------------------------------------------------------------

function TickerInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (chips: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = draft.toUpperCase().trim();
    if (!q) { setSuggestions([]); return; }
    const matches = ALL_TICKERS
      .filter((t) => t.includes(q) && !value.includes(t))
      .sort((a, b) => {
        const aStart = a.startsWith(q) ? 0 : 1;
        const bStart = b.startsWith(q) ? 0 : 1;
        return aStart - bStart || a.localeCompare(b);
      })
      .slice(0, 6);
    setSuggestions(matches);
    setFocusedIdx(-1);
  }, [draft, value]);

  function addTicker(sym: string) {
    const upper = sym.toUpperCase().trim();
    if (!upper || value.includes(upper)) return;
    onChange([...value, upper]);
    setDraft("");
    setSuggestions([]);
    inputRef.current?.focus();
  }

  function removeTicker(sym: string) {
    onChange(value.filter((v) => v !== sym));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === "," || e.key === "Tab") && draft.trim()) {
      e.preventDefault();
      if (focusedIdx >= 0 && suggestions[focusedIdx]) {
        addTicker(suggestions[focusedIdx]);
      } else {
        addTicker(draft.trim());
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setSuggestions([]);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className="relative flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded-xl border border-stone-200 bg-white min-h-[44px] cursor-text focus-within:border-stone-400 transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((sym) => (
        <span key={sym} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900 text-white text-[11px] font-bold">
          {sym}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTicker(sym); }}
            className="text-stone-400 hover:text-white leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? "Type a ticker… (NVDA, AAPL, TSLA)" : "Add more…"}
        className="flex-1 min-w-[120px] text-sm placeholder:text-stone-300 bg-transparent outline-none"
      />

      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-20 w-full mt-1 rounded-xl bg-white border border-stone-200 shadow-lg py-1">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTicker(s); }}
              className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${
                i === focusedIdx ? "bg-sky-50 text-sky-700" : "text-stone-800 hover:bg-stone-50"
              }`}
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
// Entry card
// ---------------------------------------------------------------------------

function EntryCard({
  entry,
  expanded,
  onToggle,
  onRedo,
  onSuggestionAction,
}: {
  entry: ResearchEntry;
  expanded: boolean;
  onToggle: () => void;
  onRedo: (symbols: string[]) => void;
  onSuggestionAction: (idx: number, action: "accept" | "dismiss") => void;
}) {
  const isRunning = entry.status === "pending" || entry.status === "running";
  const isFailed = entry.status === "failed";

  return (
    <div className={`rounded-xl border bg-white overflow-hidden transition-colors ${
      isFailed ? "border-red-200" : "border-stone-200"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          {isRunning ? (
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
          ) : isFailed ? (
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-900">
                {entry.symbols.slice(0, 5).join(", ")}
                {entry.symbols.length > 5 && ` +${entry.symbols.length - 5}`}
              </span>
              <span className="text-[10px] text-stone-400">
                {isRunning ? "analyzing…" : isFailed ? "failed" : timeAgo(entry.timestamp)}
              </span>
            </div>
            {!isRunning && entry.suggestions && entry.suggestions.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {entry.suggestions.slice(0, 4).map((s, i) => (
                  <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${strategyColor(s.strategy)}`}>
                    {s.symbol} {s.strategy}
                  </span>
                ))}
                {entry.suggestions.length > 4 && (
                  <span className="text-[10px] text-stone-400">+{entry.suggestions.length - 4}</span>
                )}
              </div>
            )}
          </div>
          {!isRunning && (
            <svg className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </button>
        {/* Redo button */}
        <button
          onClick={() => onRedo(entry.symbols)}
          className="shrink-0 px-2 py-1 rounded-lg border border-stone-200 text-[10px] font-semibold text-stone-500 hover:border-stone-300 hover:text-stone-700 transition-colors"
          title="Run research again for these tickers"
        >
          Redo
        </button>
      </div>

      {/* Running state inline */}
      {isRunning && (
        <div className="px-4 pb-3">
          <p className="text-xs text-stone-400">AI is analyzing market data and technicals…</p>
          <div className="mt-2 h-0.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 animate-pulse w-3/5 rounded-full" />
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-600">{entry.error || "Research failed. Try again."}</p>
        </div>
      )}

      {/* Expanded content */}
      {expanded && entry.status === "completed" && (
        <div className="border-t border-stone-100">
          {/* Trade suggestions */}
          {entry.suggestions && entry.suggestions.length > 0 && (
            <div className="px-4 py-3 border-b border-stone-100">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 mb-2">
                Trade Suggestions ({entry.suggestions.length})
              </p>
              <div className="flex flex-col gap-2.5">
                {entry.suggestions.map((suggestion, idx) => {
                  const isAccepted = entry.accepted.has(idx);
                  const isDismissed = entry.dismissed.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border bg-white p-3 transition-opacity ${
                        isDismissed ? "opacity-40 border-stone-100"
                          : isAccepted ? "border-emerald-300 bg-emerald-50/30"
                          : "border-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900">{suggestion.symbol}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${strategyColor(suggestion.strategy)}`}>
                            {strategyLabel(suggestion.strategy)}
                          </span>
                        </div>
                        {suggestion.premium !== undefined && (
                          <span className={`text-sm font-bold ${suggestion.premium >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            {formatDollar(suggestion.premium)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-stone-800 bg-stone-50 rounded-lg px-3 py-2 mb-1.5">
                        {suggestion.action}
                      </p>
                      <div className="flex gap-4 mb-1.5 text-xs text-stone-500">
                        {suggestion.strike !== undefined && (
                          <span>Strike: <span className="font-medium text-stone-700">${suggestion.strike}</span></span>
                        )}
                        {suggestion.expiry && (
                          <span>Expiry: <span className="font-medium text-stone-700">{suggestion.expiry}</span></span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed mb-2">{suggestion.reasoning}</p>
                      {suggestion.strategy !== "AVOID" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSuggestionAction(idx, "accept")}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isAccepted ? "bg-emerald-600 text-white" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {isAccepted ? "Accepted" : "Accept"}
                          </button>
                          <button
                            onClick={() => onSuggestionAction(idx, "dismiss")}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isDismissed ? "bg-stone-400 text-white" : "border border-stone-200 text-stone-500 hover:bg-stone-50"
                            }`}
                          >
                            {isDismissed ? "Dismissed" : "Dismiss"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full report */}
          {entry.report && (
            <div className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 mb-3">Full Report</p>
              <MarkdownReport content={entry.report} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResearchPage() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [mode, setMode] = useState<"hybrid" | "deep">("hybrid");
  const [entries, setEntries] = useState<ResearchEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load last 10 from history on mount
  useEffect(() => {
    fetch("/api/research/history")
      .then((r) => r.json())
      .then((d) => {
        const reports = (d.reports || []).slice(0, 10);
        const loaded: ResearchEntry[] = reports.map((r: {
          id: string;
          symbols: string[];
          mode?: string;
          report: string;
          createdAt: string;
          suggestions: TradeSuggestion[];
        }) => ({
          id: r.id,
          status: "completed" as const,
          symbols: r.symbols || [],
          mode: r.mode || "hybrid",
          report: r.report,
          suggestions: r.suggestions || [],
          timestamp: r.createdAt,
          dismissed: new Set<number>(),
          accepted: new Set<number>(),
        }));
        setEntries(loaded);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  }, []);

  // Poll for any running entries
  useEffect(() => {
    const runningIds = entries
      .filter((e) => e.status === "pending" || e.status === "running")
      .map((e) => e.id);
    if (runningIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const id of runningIds) {
        try {
          const res = await fetch(`/api/research/status?id=${id}`);
          const data = await res.json();
          if (data.report?.status === "completed") {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      status: "completed",
                      report: data.report.report,
                      suggestions: data.suggestions || [],
                      timestamp: data.report.created_at,
                    }
                  : e
              )
            );
            setExpandedId(id);
            // Mark opened
            fetch("/api/research/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reportId: id }),
            });
          } else if (data.report?.status === "failed") {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id
                  ? { ...e, status: "failed", error: data.report.report || "Research failed" }
                  : e
              )
            );
          }
        } catch {
          // keep polling
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [entries]);

  const runResearch = useCallback(async (symbolsToRun?: string[]) => {
    const symbols = symbolsToRun ?? tickers;
    if (symbols.length === 0) return;

    // Add a pending entry immediately at the top
    const pendingId = `pending-${Date.now()}`;
    const pendingEntry: ResearchEntry = {
      id: pendingId,
      status: "pending",
      symbols,
      mode,
      timestamp: new Date().toISOString(),
      dismissed: new Set(),
      accepted: new Set(),
    };
    setEntries((prev) => [pendingEntry, ...prev]);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEntries((prev) =>
          prev.map((e) =>
            e.id === pendingId
              ? { ...e, status: "failed", error: data.error || "Request failed" }
              : e
          )
        );
        return;
      }

      const data = await res.json();

      if (data.reportId && data.report) {
        // Completed inline
        setEntries((prev) =>
          prev.map((e) =>
            e.id === pendingId
              ? {
                  ...e,
                  id: data.reportId,
                  status: "completed",
                  report: data.report,
                  suggestions: data.suggestions || [],
                  timestamp: data.timestamp,
                  aiProvider: data.aiProvider,
                  aiModel: data.aiModel,
                }
              : e
          )
        );
        setExpandedId(data.reportId);
        fetch("/api/research/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: data.reportId }),
        });
      } else if (data.reportId) {
        // Still running — update id, poll will pick it up
        setEntries((prev) =>
          prev.map((e) =>
            e.id === pendingId
              ? { ...e, id: data.reportId, status: "running" }
              : e
          )
        );
      }
    } catch (e) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === pendingId
            ? { ...entry, status: "failed", error: e instanceof Error ? e.message : "Unknown error" }
            : entry
        )
      );
    }
  }, [tickers, mode]);

  const handleSuggestionAction = useCallback((
    entryId: string,
    idx: number,
    action: "accept" | "dismiss"
  ) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const newAccepted = new Set(e.accepted);
        const newDismissed = new Set(e.dismissed);
        if (action === "accept") { newAccepted.add(idx); newDismissed.delete(idx); }
        else { newDismissed.add(idx); newAccepted.delete(idx); }
        return { ...e, accepted: newAccepted, dismissed: newDismissed };
      })
    );
  }, []);

  const lastCompleted = [...entries].reverse().find(e => e.status === "completed");
  const hasRunning = entries.some((e) => e.status === "pending" || e.status === "running");

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-stone-900">Research</h2>
            <AIModelBadge 
              provider={lastCompleted?.aiProvider as any} 
              model={lastCompleted?.aiModel} 
              timestamp={lastCompleted?.timestamp}
            />
          </div>
          <p className="text-xs text-stone-500 mt-0.5">AI-powered options analysis</p>
        </div>
        <Link
          href="/research/history"
          className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          All History
        </Link>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2.5">
        <TickerInput value={tickers} onChange={setTickers} />

        <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100">
          <button
            onClick={() => setMode("hybrid")}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "hybrid" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
          >
            Hybrid (fast)
          </button>
          <button
            onClick={() => setMode("deep")}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "deep" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
          >
            Deep (thorough)
          </button>
        </div>

        <button
          onClick={() => runResearch()}
          disabled={tickers.length === 0 || hasRunning}
          className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {hasRunning ? "Analyzing…" : "Run Research"}
        </button>
      </div>

      {/* Entries */}
      {loadingHistory ? (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-stone-400">
          <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" />
          Loading history…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900">Ready to research</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">
            Type tickers above and hit Run. AI will analyze live market data and generate specific trade suggestions.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Recent</span>
            {entries.length >= 10 && (
              <Link href="/research/history" className="text-[10px] font-medium text-sky-600 hover:text-sky-800">
                View all →
              </Link>
            )}
          </div>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onRedo={(symbols) => { setTickers(symbols); runResearch(symbols); }}
              onSuggestionAction={(idx, action) => handleSuggestionAction(entry.id, idx, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
