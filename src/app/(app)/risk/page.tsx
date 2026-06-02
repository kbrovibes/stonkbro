import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getQuotes } from "@/lib/market/yahoo";
import Link from "next/link";

export const dynamic = "force-dynamic";

type RiskPosition = {
  id: string;
  symbol: string;
  strategy: string;
  trailing_stop_pct: number;
  peak_price: number;
  entry_price_per_share: number;
  currentPrice: number;
  drawdownPct: number;
  gainPct: number;
  stopTriggerPrice: number;
  status: "safe" | "warning" | "triggered";
};

export default async function RiskDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-stone-500 dark:text-text-subtle">Please sign in to view risk dashboard.</p>
      </div>
    );
  }

  const allPositions = await getPositions(user.id);
  const activeWithStops = allPositions.filter(
    (p: { status: string; trailing_stop_pct: number | null }) =>
      p.status === "active" && p.trailing_stop_pct !== null
  );

  if (activeWithStops.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5">
        <h2 className="text-lg font-bold text-stone-900 dark:text-text mb-2">Risk Dashboard</h2>
        <div className="flex flex-col items-center justify-center flex-1 py-16">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-stone-400 dark:text-text-faint"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.25-8.25-3.286Z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-text-muted mb-1">
            No trailing stops active
          </h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle text-center max-w-xs">
            Set up trailing stops on your positions to automatically track peak
            prices and get alerted when stocks drop from their highs. Go to any
            active position to configure.
          </p>
          <Link
            href="/positions"
            className="mt-4 text-xs font-semibold text-stone-700 dark:text-text-muted bg-stone-100 dark:bg-surface-muted hover:bg-stone-200 dark:hover:bg-surface-sunken px-4 py-2 rounded-lg transition-colors"
          >
            View Positions
          </Link>
        </div>
      </div>
    );
  }

  // Fetch live quotes
  const symbols = [...new Set(activeWithStops.map((p: { symbol: string }) => p.symbol))];
  const quotes = await getQuotes(symbols);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  // Build risk data
  const riskPositions: RiskPosition[] = activeWithStops.map(
    (p: {
      id: string;
      symbol: string;
      strategy: string;
      trailing_stop_pct: number;
      peak_price: number;
      entry_price_per_share: number;
    }) => {
      const quote = quoteMap.get(p.symbol);
      const currentPrice = quote?.price ?? 0;
      const drawdownPct =
        p.peak_price > 0
          ? ((p.peak_price - currentPrice) / p.peak_price) * 100
          : 0;
      const gainPct =
        p.entry_price_per_share > 0
          ? ((currentPrice - p.entry_price_per_share) / p.entry_price_per_share) * 100
          : 0;
      const stopTriggerPrice = p.peak_price * (1 - p.trailing_stop_pct / 100);
      const isTriggered = currentPrice <= stopTriggerPrice;
      const isWarning = !isTriggered && drawdownPct >= p.trailing_stop_pct / 2;

      return {
        id: p.id,
        symbol: p.symbol,
        strategy: p.strategy,
        trailing_stop_pct: p.trailing_stop_pct,
        peak_price: p.peak_price,
        entry_price_per_share: p.entry_price_per_share,
        currentPrice,
        drawdownPct,
        gainPct,
        stopTriggerPrice,
        status: isTriggered ? "triggered" : isWarning ? "warning" : "safe",
      };
    }
  );

  // Sort: triggered first, then warning, then safe
  const statusOrder = { triggered: 0, warning: 1, safe: 2 };
  riskPositions.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  // Summary stats
  const totalGain =
    riskPositions.reduce((sum, p) => sum + p.gainPct, 0) / riskPositions.length;
  const largestDrawdown = Math.max(...riskPositions.map((p) => p.drawdownPct));
  const atRiskCount = riskPositions.filter(
    (p) => p.status === "triggered" || p.status === "warning"
  ).length;

  const statusBorder = {
    triggered: "border-red-300",
    warning: "border-amber-300",
    safe: "border-emerald-200 dark:border-gain-border",
  };
  const statusBg = {
    triggered: "bg-red-50 dark:bg-loss-bg",
    warning: "bg-amber-50",
    safe: "bg-white dark:bg-surface-elevated",
  };
  const statusBadge = {
    triggered: "bg-red-100 dark:bg-loss-bg text-red-700 dark:text-loss-strong",
    warning: "bg-amber-100 text-amber-700",
    safe: "bg-emerald-100 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  };
  const statusLabel = {
    triggered: "TRIGGERED",
    warning: "WARNING",
    safe: "SAFE",
  };

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <h2 className="text-lg font-bold text-stone-900 dark:text-text mb-1">Risk Dashboard</h2>
      <p className="text-xs text-stone-500 dark:text-text-subtle mb-5">
        Trailing stop monitor for all active positions
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Avg Gain
          </p>
          <p
            className={`text-base font-bold mt-1 ${
              totalGain >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-600 dark:text-loss"
            }`}
          >
            {totalGain >= 0 ? "+" : ""}
            {totalGain.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Max Drawdown
          </p>
          <p
            className={`text-base font-bold mt-1 ${
              largestDrawdown > 10
                ? "text-red-600 dark:text-loss"
                : largestDrawdown > 5
                  ? "text-amber-600"
                  : "text-stone-900 dark:text-text"
            }`}
          >
            -{largestDrawdown.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            At Risk
          </p>
          <p
            className={`text-base font-bold mt-1 ${
              atRiskCount > 0 ? "text-red-600 dark:text-loss" : "text-emerald-600 dark:text-gain"
            }`}
          >
            {atRiskCount}/{riskPositions.length}
          </p>
        </div>
      </div>

      {/* Position cards */}
      <div className="flex flex-col gap-3">
        {riskPositions.map((p) => (
          <Link
            key={p.id}
            href={`/positions/${p.id}`}
            className={`rounded-xl border ${statusBorder[p.status]} ${statusBg[p.status]} p-4 transition-colors hover:opacity-90`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900 dark:text-text">
                  {p.symbol}
                </span>
                <span className="text-[10px] text-stone-400 dark:text-text-faint font-medium">
                  {p.strategy}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[p.status]}`}
              >
                {statusLabel[p.status]}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <p className="text-[10px] text-stone-400 dark:text-text-faint">Entry</p>
                <p className="text-xs font-bold text-stone-900 dark:text-text">
                  ${p.entry_price_per_share.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 dark:text-text-faint">Current</p>
                <p className="text-xs font-bold text-stone-900 dark:text-text">
                  ${p.currentPrice.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 dark:text-text-faint">Peak</p>
                <p className="text-xs font-bold text-stone-900 dark:text-text">
                  ${p.peak_price.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 dark:text-text-faint">Gain</p>
                <p
                  className={`text-xs font-bold ${
                    p.gainPct >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-600 dark:text-loss"
                  }`}
                >
                  {p.gainPct >= 0 ? "+" : ""}
                  {p.gainPct.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className="text-stone-400 dark:text-text-faint">
                Stop: {p.trailing_stop_pct}% (${p.stopTriggerPrice.toFixed(2)})
              </span>
              <span
                className={
                  p.status === "triggered"
                    ? "text-red-600 dark:text-loss font-semibold"
                    : p.status === "warning"
                      ? "text-amber-600 font-semibold"
                      : "text-stone-400 dark:text-text-faint"
                }
              >
                Drawdown: {p.drawdownPct.toFixed(1)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
