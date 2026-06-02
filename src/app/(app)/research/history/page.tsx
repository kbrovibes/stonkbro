"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold text-stone-900 dark:text-text mt-3 mb-1">{line.replace(/^###\s*/, "")}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-extrabold text-stone-900 dark:text-text mt-4 mb-1">{line.replace(/^##\s*/, "")}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-base font-extrabold text-stone-900 dark:text-text mt-4 mb-2">{line.replace(/^#\s*/, "")}</h1>;
        if (line.match(/^\s*[-*]\s/)) return <p key={i} className="text-xs text-stone-600 dark:text-text-muted py-0.5 pl-3">• {line.replace(/^\s*[-*]\s*/, "")}</p>;
        if (line.match(/^\d+\.\s/)) return <p key={i} className="text-xs text-stone-700 dark:text-text-muted py-0.5">{line}</p>;
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        // Bold text
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (formatted !== line) return <p key={i} className="text-xs text-stone-700 dark:text-text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
        return <p key={i} className="text-xs text-stone-700 dark:text-text-muted leading-relaxed">{line}</p>;
      })}
    </>
  );
}

type Suggestion = {
  id: string;
  symbol: string;
  strategy: string;
  action: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  reasoning: string;
  status: string;
};

type Report = {
  id: string;
  trigger: string;
  symbols: string[];
  report: string;
  createdAt: string;
  suggestions: Suggestion[];
};

function strategyColor(strategy: string) {
  switch (strategy) {
    case "CSP": return "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover";
    case "CC": return "bg-amber-50 text-amber-700";
    case "PMCC": return "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong";
    case "AVOID": return "bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong";
    default: return "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted";
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function ResearchHistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/research/history")
      .then((r) => r.json())
      .then((d) => { setReports(d.reports || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">Research History</h2>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">{reports.length} past research runs</p>
        </div>
        <Link
          href="/research"
          className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
        >
          New Research
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse mr-2" />
          <span className="text-xs text-stone-500 dark:text-text-subtle">Loading history...</span>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-text">No research yet</h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-1">Run your first research to see history here.</p>
          <Link href="/research" className="mt-4 px-4 py-2 rounded-lg bg-stone-900 dark:bg-surface-elevated text-white text-xs font-semibold">
            Run Research
          </Link>
        </div>
      )}

      {!loading && reports.map((report) => {
        const isExpanded = expandedId === report.id;
        return (
          <div key={report.id} className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated overflow-hidden">
            {/* Header — clickable to expand */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-surface-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-stone-900 dark:text-text">
                    {report.symbols.slice(0, 5).join(", ")}
                    {report.symbols.length > 5 && ` +${report.symbols.length - 5}`}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-text-faint">{timeAgo(report.createdAt)}</span>
                  {report.trigger === "cron" && (
                    <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">auto</span>
                  )}
                </div>
                {report.suggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {report.suggestions.slice(0, 4).map((s, i) => (
                      <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${strategyColor(s.strategy)}`}>
                        {s.symbol} {s.strategy}
                      </span>
                    ))}
                    {report.suggestions.length > 4 && (
                      <span className="text-[10px] text-stone-400 dark:text-text-faint">+{report.suggestions.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <svg className={`w-4 h-4 text-stone-400 dark:text-text-faint shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-stone-100 dark:border-border-subtle">
                {/* Suggestions */}
                {report.suggestions.length > 0 && (
                  <div className="px-4 py-3 border-b border-stone-100 dark:border-border-subtle">
                    <h4 className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 dark:text-text-faint mb-2">Trade Suggestions</h4>
                    <div className="flex flex-col gap-2">
                      {report.suggestions.map((s) => (
                        <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-stone-50 dark:bg-surface">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${strategyColor(s.strategy)}`}>
                            {s.strategy}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link href={`/ticker/${s.symbol}`} className="text-xs font-bold text-stone-900 dark:text-text hover:text-sky-700">
                                {s.symbol}
                              </Link>
                              <span className="text-[10px] text-stone-400 dark:text-text-faint">{s.action}</span>
                              {s.strike && <span className="text-[10px] text-stone-500 dark:text-text-subtle">${s.strike}</span>}
                            </div>
                            <p className="text-[10px] text-stone-500 dark:text-text-subtle mt-0.5 leading-relaxed">{s.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full report */}
                <div className="px-4 py-4">
                  <h4 className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 dark:text-text-faint mb-2">Full Report</h4>
                  <div className="text-xs text-stone-700 dark:text-text-muted leading-relaxed">
                    <SimpleMarkdown content={report.report} />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-stone-100 dark:border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 dark:text-text-faint">
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-text-faint">
                    {report.symbols.length} tickers · {report.suggestions.length} suggestions
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
