"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AIModelBadge } from "@/components/AIModelBadge";
import type {
  AllocationAction,
  PortfolioAllocation,
  PortfolioScanRow,
  Rating,
  TickerAnalysis,
} from "@/lib/portfolio-manager/types";

type LatestResponse = {
  scan: PortfolioScanRow | null;
  refreshing: { scan_id: string; started_at: string } | null;
};

type RatingFilter = "ALL" | "BUYS" | "HOLDS" | "SELLS";

export function PortfolioManagerView() {
  const [data, setData] = useState<LatestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<RatingFilter>("ALL");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio-manager/latest", { cache: "no-store" });
      if (!res.ok) {
        setError(`Load failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as LatestResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  // Track the scan id we kicked off so we can detect completion correctly
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  // Poll while a scan is running (either we just kicked one off, or /latest reports one)
  useEffect(() => {
    if (!data?.refreshing && !scanning && !activeScanId) return;
    const id = setInterval(() => {
      loadLatest();
    }, 4000);
    return () => clearInterval(id);
  }, [data?.refreshing, scanning, activeScanId, loadLatest]);

  // Clear the local spinner once /latest reports our scan is no longer running
  // AND the latest completed row is newer than our scan id
  useEffect(() => {
    if (!activeScanId) return;
    // Still running upstream — keep spinner
    if (data?.refreshing) return;
    // Refreshing cleared. Verify the latest completed row matches what we triggered.
    if (data?.scan && data.scan.id === activeScanId) {
      setActiveScanId(null);
      setScanning(false);
      return;
    }
    // Edge: scan failed, no completed row matches. Give it 30s grace before giving up.
  }, [activeScanId, data?.refreshing, data?.scan]);

  const onRescan = async () => {
    setScanError(null);
    setScanning(true);
    try {
      const res = await fetch("/api/portfolio-manager/scan", { method: "POST" });
      if (res.status === 409) {
        // Already running upstream — pick up its id so polling tracks it
        const j = (await res.json().catch(() => ({}))) as { scan_id?: string };
        if (j.scan_id) setActiveScanId(j.scan_id);
        await loadLatest();
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setScanError(j.error || `Scan failed (${res.status})`);
        setScanning(false);
        return;
      }
      const j = (await res.json()) as { scan_id?: string; queued?: boolean };
      if (j.scan_id) setActiveScanId(j.scan_id);
      // Trigger an immediate refresh so /latest sees the running row
      await loadLatest();
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Network error");
      setScanning(false);
    }
  };

  const toggleRow = (symbol: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const filteredAnalyses = useMemo<TickerAnalysis[]>(() => {
    const all = data?.scan?.analyses ?? [];
    if (filter === "ALL") return all;
    if (filter === "BUYS") return all.filter((a) => a.rating === "BUY" || a.rating === "STRONG_BUY");
    if (filter === "HOLDS") return all.filter((a) => a.rating === "HOLD");
    return all.filter((a) => a.rating === "SELL" || a.rating === "STRONG_SELL");
  }, [data, filter]);

  if (loading) {
    return (
      <div className="p-6 text-stone-500 text-sm">Loading portfolio manager…</div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600 text-sm">Error: {error}</div>;
  }

  const scan = data?.scan;
  const refreshing = !!data?.refreshing || scanning;

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Portfolio Manager</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            AI-driven ratings + $100K reallocation plan for your stock holdings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scan?.ai_model && (
            <AIModelBadge model={scan.ai_model} timestamp={scan.completed_at ?? scan.created_at} />
          )}
          <button
            onClick={onRescan}
            disabled={refreshing}
            className="rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-stone-300 text-white text-sm font-semibold px-3 py-1.5 transition-colors"
          >
            {refreshing ? "Running…" : "Re-run now"}
          </button>
        </div>
      </div>

      {scanError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scanError}
        </div>
      )}

      {refreshing && (
        <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
          Scan in progress — page will refresh automatically.
        </div>
      )}

      {/* Last run + filter strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs text-stone-500">
          {scan ? (
            <>
              Last scan: <span className="font-medium text-stone-700">{formatRelative(scan.completed_at ?? scan.created_at)}</span>
              {" · "}
              <span className="capitalize">{scan.scan_type}</span>
              {scan.trigger_source && ` (${scan.trigger_source})`}
              {" · "}
              {scan.ticker_count} ticker{scan.ticker_count === 1 ? "" : "s"}
            </>
          ) : (
            <>No scan yet</>
          )}
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as RatingFilter)}
          className="text-xs rounded-md border border-stone-300 bg-white px-2 py-1"
        >
          <option value="ALL">All ratings</option>
          <option value="BUYS">Buy &amp; Strong Buy</option>
          <option value="HOLDS">Hold</option>
          <option value="SELLS">Sell &amp; Strong Sell</option>
        </select>
      </div>

      {/* Empty state */}
      {!scan && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-600 mb-3">
            No scan yet. Tap <span className="font-semibold">Re-run now</span> or wait for the next market-open / market-close cron.
          </p>
        </div>
      )}

      {scan && scan.ticker_count === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-600">
            No stock holdings found in your connected portfolio. (Options are intentionally excluded.)
          </p>
        </div>
      )}

      {/* Table */}
      {scan && scan.ticker_count > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold uppercase text-stone-500 border-b border-stone-200 bg-stone-50">
            <div className="col-span-2">Symbol</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-right">1d</div>
            <div className="col-span-1 text-right">30d</div>
            <div className="col-span-1 text-right">RSI</div>
            <div className="col-span-2">Rating</div>
            <div className="col-span-2">Conf.</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {filteredAnalyses.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-stone-500">
              No tickers match the current filter.
            </div>
          ) : (
            filteredAnalyses.map((a) => (
              <Row
                key={a.symbol}
                analysis={a}
                expanded={expanded.has(a.symbol)}
                onToggle={() => toggleRow(a.symbol)}
              />
            ))
          )}
        </div>
      )}

      {/* Allocation card */}
      {scan?.allocation && (
        <AllocationCard allocation={scan.allocation} />
      )}
    </div>
  );
}

function Row({
  analysis,
  expanded,
  onToggle,
}: {
  analysis: TickerAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const e = analysis.enrichment;
  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-sm hover:bg-stone-50 transition-colors text-left"
      >
        <div className="col-span-2 font-bold text-stone-900">{analysis.symbol}</div>
        <div className="col-span-2 text-right tabular-nums text-stone-700">
          ${e.price.toFixed(2)}
        </div>
        <div className={`col-span-1 text-right tabular-nums text-xs ${e.change_1d_pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {signed(e.change_1d_pct)}%
        </div>
        <div className={`col-span-1 text-right tabular-nums text-xs ${e.change_30d_pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {signed(e.change_30d_pct)}%
        </div>
        <div className={`col-span-1 text-right tabular-nums text-xs ${rsiColor(e.rsi_14)}`}>
          {e.rsi_14 ?? "—"}
        </div>
        <div className="col-span-2">
          <RatingPill rating={analysis.rating} />
        </div>
        <div className="col-span-2">
          <ConfidenceBar value={analysis.confidence} />
        </div>
        <div className="col-span-1 text-right">
          <ActionBadge type={analysis.suggested_action.type} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 text-sm bg-stone-50 border-t border-stone-100">
          {analysis.thesis && (
            <p className="text-stone-800 mb-3 leading-snug">{analysis.thesis}</p>
          )}

          {/* Mini technicals strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 text-xs">
            <Cell label="RSI 14" value={e.rsi_14?.toString() ?? "—"} />
            <Cell label="SMA 50" value={e.sma_50 ? `$${e.sma_50.toFixed(2)} ${e.above_50sma ? "✓" : "✗"}` : "—"} />
            <Cell label="SMA 200" value={e.sma_200 ? `$${e.sma_200.toFixed(2)} ${e.above_200sma ? "✓" : "✗"}` : "—"} />
            <Cell label="Vol vs avg" value={`${e.volume_ratio.toFixed(2)}x`} />
            <Cell label="52w hi/lo" value={`-${e.distance_from_52w_high_pct.toFixed(1)}% / +${e.distance_from_52w_low_pct.toFixed(1)}%`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <BulletBlock title="Reasons" items={analysis.reasons} dotColor="bg-emerald-500" />
            <BulletBlock title="Risks" items={analysis.risks} dotColor="bg-amber-500" />
            <BulletBlock title="Catalysts" items={analysis.catalysts} dotColor="bg-sky-500" />
          </div>

          {/* Suggested action detail */}
          <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs mb-3">
            <span className="font-semibold text-stone-700">Suggested action: </span>
            <ActionBadge type={analysis.suggested_action.type} />
            {"target_pct_of_position" in analysis.suggested_action && (
              <span className="ml-2 text-stone-600">
                {analysis.suggested_action.target_pct_of_position}% of position
              </span>
            )}
            {"note" in analysis.suggested_action && analysis.suggested_action.note && (
              <span className="ml-2 text-stone-600">— {analysis.suggested_action.note}</span>
            )}
          </div>

          {/* News */}
          {e.news_headlines.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-stone-500 mb-1">Recent news</div>
              <ul className="space-y-1">
                {e.news_headlines.slice(0, 3).map((h, i) => (
                  <li key={i} className="text-xs">
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:underline"
                    >
                      {h.title}
                    </a>
                    {h.publisher && <span className="text-stone-500"> · {h.publisher}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {e.news_headlines.length === 0 && (
            <div className="text-xs text-stone-400 italic">No recent headlines available.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white border border-stone-200 px-2 py-1">
      <div className="text-[9px] uppercase font-semibold text-stone-500">{label}</div>
      <div className="text-stone-800 font-medium tabular-nums">{value}</div>
    </div>
  );
}

function BulletBlock({ title, items, dotColor }: { title: string; items: string[]; dotColor: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase text-stone-500 mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-stone-700">
            <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dotColor} shrink-0`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RatingPill({ rating }: { rating: Rating }) {
  const styles: Record<Rating, string> = {
    STRONG_BUY: "bg-emerald-100 text-emerald-800 border-emerald-200",
    BUY: "bg-green-100 text-green-800 border-green-200",
    HOLD: "bg-stone-100 text-stone-700 border-stone-200",
    SELL: "bg-amber-100 text-amber-800 border-amber-200",
    STRONG_SELL: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<Rating, string> = {
    STRONG_BUY: "STRONG BUY",
    BUY: "BUY",
    HOLD: "HOLD",
    SELL: "SELL",
    STRONG_SELL: "STRONG SELL",
  };
  return (
    <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${styles[rating]}`}>
      {labels[rating]}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : "bg-stone-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-stone-500 w-6 text-right">{pct}</span>
    </div>
  );
}

function ActionBadge({ type }: { type: "HOLD" | "TRIM" | "ADD" | "EXIT" }) {
  const styles: Record<typeof type, string> = {
    HOLD: "bg-stone-100 text-stone-700",
    TRIM: "bg-amber-100 text-amber-800",
    ADD: "bg-emerald-100 text-emerald-800",
    EXIT: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${styles[type]}`}>
      {type}
    </span>
  );
}

function AllocationCard({ allocation }: { allocation: PortfolioAllocation }) {
  return (
    <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-sky-900">Today&apos;s $100K reallocation plan</h2>
        <span className="text-[10px] font-semibold text-sky-700">
          Deployed ${allocation.capital_deployed.toLocaleString()} / $100,000
        </span>
      </div>
      <p className="text-sm text-stone-800 mb-3 leading-snug">{allocation.summary}</p>

      <div className="rounded-lg border border-sky-200 bg-white overflow-hidden mb-3">
        <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase text-stone-500 border-b border-stone-200 bg-stone-50">
          <div className="col-span-2">Symbol</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-6">Rationale</div>
        </div>
        {allocation.actions.map((a, i) => (
          <AllocationRow key={`${a.symbol}-${i}`} action={a} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <Pill label="Capital released" value={`$${allocation.capital_released.toLocaleString()}`} color="bg-amber-100 text-amber-800" />
        <Pill label="Capital deployed" value={`$${allocation.capital_deployed.toLocaleString()}`} color="bg-emerald-100 text-emerald-800" />
        <Pill label="Cash remaining" value={`$${allocation.cash_remaining.toLocaleString()}`} color="bg-sky-100 text-sky-800" />
      </div>

      {allocation.risk_notes.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase text-stone-500 mb-1">Risk notes</div>
          <ul className="space-y-1">
            {allocation.risk_notes.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-stone-700">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AllocationRow({ action }: { action: AllocationAction }) {
  const styles: Record<AllocationAction["action"], string> = {
    SELL: "bg-red-100 text-red-800",
    TRIM: "bg-amber-100 text-amber-800",
    HOLD: "bg-stone-100 text-stone-700",
    ADD: "bg-emerald-100 text-emerald-800",
    BUY: "bg-sky-100 text-sky-800",
  };
  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-t border-stone-100 first:border-t-0 items-center">
      <div className="col-span-2 font-bold text-stone-900">{action.symbol}</div>
      <div className="col-span-2">
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${styles[action.action]}`}>
          {action.action}
        </span>
      </div>
      <div className="col-span-2 text-right tabular-nums text-stone-700">
        ${action.dollar_amount.toLocaleString()}
      </div>
      <div className="col-span-6 text-stone-600 leading-snug">{action.rationale}</div>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${color}`}>
      <span className="text-[10px] uppercase font-semibold opacity-80">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function rsiColor(rsi: number | null): string {
  if (rsi === null) return "text-stone-400";
  if (rsi <= 30) return "text-emerald-600";
  if (rsi >= 70) return "text-red-600";
  return "text-stone-600";
}

function signed(n: number): string {
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
