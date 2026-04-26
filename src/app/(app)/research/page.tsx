"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type TradeSuggestion = {
  symbol: string;
  strategy: string;
  action: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  reasoning: string;
};

type ResearchRun = {
  id: string;
  report: string;
  suggestions: TradeSuggestion[];
  symbolsAnalyzed: string[];
  timestamp: string;
  dismissed: Set<number>;
  accepted: Set<number>;
};

const DEFAULT_SYMBOLS = "NVDA, AAPL, MSFT, TSLA, AMD, PLTR, META, AMZN";

function strategyColor(strategy: string) {
  switch (strategy) {
    case "CSP":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "CC":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "PMCC":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "AVOID":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-stone-100 text-stone-600 border-stone-200";
  }
}

function strategyLabel(strategy: string) {
  switch (strategy) {
    case "CSP":
      return "Cash-Secured Put";
    case "CC":
      return "Covered Call";
    case "PMCC":
      return "Poor Man's CC";
    case "AVOID":
      return "Avoid";
    default:
      return strategy;
  }
}

function formatDollar(n: number | undefined) {
  if (n === undefined || n === null) return "--";
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2);
}

// Simple markdown renderer for the report
function MarkdownReport({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={i} className="text-sm font-bold text-stone-800 mt-4 mb-1">
          {line.replace(/^####\s*/, "")}
        </h4>
      );
    } else if (line.startsWith("### ")) {
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
    } else if (line.startsWith("- **") || line.startsWith("  - **")) {
      const indent = line.startsWith("  ") ? "ml-4" : "";
      const boldMatch = line.match(/\*\*(.+?)\*\*(.*)/);
      if (boldMatch) {
        elements.push(
          <p key={i} className={`text-sm text-stone-700 ${indent} py-0.5`}>
            <span className="font-semibold text-stone-900">{boldMatch[1]}</span>
            {formatInlineMarkdown(boldMatch[2])}
          </p>
        );
      } else {
        elements.push(
          <p key={i} className={`text-sm text-stone-700 ${indent} py-0.5`}>
            {formatInlineMarkdown(line.replace(/^\s*-\s*/, ""))}
          </p>
        );
      }
    } else if (line.match(/^\s*-\s/)) {
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const ml = indent > 0 ? "ml-4" : "";
      elements.push(
        <p key={i} className={`text-sm text-stone-600 ${ml} py-0.5 flex`}>
          <span className="text-stone-400 mr-2 flex-shrink-0">-</span>
          <span>{formatInlineMarkdown(line.replace(/^\s*-\s*/, ""))}</span>
        </p>
      );
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(
        <p key={i} className="text-sm text-stone-700 py-0.5">
          {formatInlineMarkdown(line)}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-stone-700 leading-relaxed">
          {formatInlineMarkdown(line)}
        </p>
      );
    }
  }

  return <div className="space-y-0">{elements}</div>;
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Handle **bold** and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.substring(0, boldMatch.index));
      }
      parts.push(
        <span key={key++} className="font-semibold text-stone-900">
          {boldMatch[1]}
        </span>
      );
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
}

export default function ResearchPage() {
  const [symbolsInput, setSymbolsInput] = useState(DEFAULT_SYMBOLS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const runResearch = useCallback(async () => {
    const symbols = symbolsInput
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    if (symbols.length === 0) {
      setError("Enter at least one symbol");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      const newRun: ResearchRun = {
        id: crypto.randomUUID(),
        report: data.report,
        suggestions: data.suggestions,
        symbolsAnalyzed: data.symbolsAnalyzed,
        timestamp: data.timestamp,
        dismissed: new Set(),
        accepted: new Set(),
      };

      setRuns((prev) => [newRun, ...prev]);
      setExpandedReport(newRun.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [symbolsInput]);

  const handleSuggestionAction = (
    runId: string,
    suggestionIndex: number,
    action: "accept" | "dismiss"
  ) => {
    setRuns((prev) =>
      prev.map((run) => {
        if (run.id !== runId) return run;
        const newAccepted = new Set(run.accepted);
        const newDismissed = new Set(run.dismissed);
        if (action === "accept") {
          newAccepted.add(suggestionIndex);
          newDismissed.delete(suggestionIndex);
        } else {
          newDismissed.add(suggestionIndex);
          newAccepted.delete(suggestionIndex);
        }
        return { ...run, accepted: newAccepted, dismissed: newDismissed };
      })
    );
  };

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900">Deep Research</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            AI-powered options analysis with specific trade suggestions
          </p>
        </div>
        <Link
          href="/research/history"
          className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          History
        </Link>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-3">
        <textarea
          value={symbolsInput}
          onChange={(e) => setSymbolsInput(e.target.value)}
          placeholder="Enter symbols separated by commas..."
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm placeholder:text-stone-300 focus:outline-none focus:border-stone-400 resize-none"
        />
        <button
          onClick={runResearch}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing..." : "Run Research"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-sm text-stone-600 font-medium">Claude is analyzing your stocks...</span>
          </div>
          <p className="text-xs text-stone-400 text-center max-w-xs">
            Fetching live market data, analyzing technicals, and generating specific trade recommendations. This usually takes 15-30 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700 font-medium">Research failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {runs.map((run) => (
        <div key={run.id} className="flex flex-col gap-4">
          {/* Run header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Research Run
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {new Date(run.timestamp).toLocaleString()} — {run.symbolsAnalyzed.join(", ")}
              </p>
            </div>
            <button
              onClick={() =>
                setExpandedReport(expandedReport === run.id ? null : run.id)
              }
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              {expandedReport === run.id ? "Hide Report" : "Show Report"}
            </button>
          </div>

          {/* Report */}
          {expandedReport === run.id && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 overflow-hidden">
              <MarkdownReport content={run.report} />
            </div>
          )}

          {/* Trade Suggestions */}
          {run.suggestions.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Trade Suggestions ({run.suggestions.length})
              </p>
              {run.suggestions.map((suggestion, idx) => {
                const isAccepted = run.accepted.has(idx);
                const isDismissed = run.dismissed.has(idx);

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border bg-white p-4 transition-opacity ${
                      isDismissed
                        ? "opacity-40 border-stone-100"
                        : isAccepted
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-stone-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">
                          {suggestion.symbol}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${strategyColor(
                            suggestion.strategy
                          )}`}
                        >
                          {strategyLabel(suggestion.strategy)}
                        </span>
                      </div>
                      {suggestion.premium !== undefined && (
                        <span
                          className={`text-sm font-bold ${
                            suggestion.premium >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatDollar(suggestion.premium)}
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <p className="text-xs font-medium text-stone-800 bg-stone-50 rounded-lg px-3 py-2 mb-2">
                      {suggestion.action}
                    </p>

                    {/* Details row */}
                    <div className="flex gap-4 mb-2 text-xs text-stone-500">
                      {suggestion.strike !== undefined && (
                        <span>
                          Strike: <span className="font-medium text-stone-700">${suggestion.strike}</span>
                        </span>
                      )}
                      {suggestion.expiry && (
                        <span>
                          Expiry: <span className="font-medium text-stone-700">{suggestion.expiry}</span>
                        </span>
                      )}
                    </div>

                    {/* Reasoning */}
                    <p className="text-xs text-stone-600 leading-relaxed mb-3">
                      {suggestion.reasoning}
                    </p>

                    {/* Action buttons */}
                    {suggestion.strategy !== "AVOID" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleSuggestionAction(run.id, idx, "accept")
                          }
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isAccepted
                              ? "bg-emerald-600 text-white"
                              : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {isAccepted ? "Accepted" : "Accept"}
                        </button>
                        <button
                          onClick={() =>
                            handleSuggestionAction(run.id, idx, "dismiss")
                          }
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isDismissed
                              ? "bg-stone-400 text-white"
                              : "border border-stone-200 text-stone-500 hover:bg-stone-50"
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
          )}

          {/* Divider between runs */}
          {runs.indexOf(run) < runs.length - 1 && (
            <hr className="border-stone-100 my-2" />
          )}
        </div>
      ))}

      {/* Empty state */}
      {!loading && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            Ready to research
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">
            Enter stock symbols and hit Run Research. Claude will analyze live
            market data and generate specific options trade suggestions.
          </p>
        </div>
      )}
    </div>
  );
}
