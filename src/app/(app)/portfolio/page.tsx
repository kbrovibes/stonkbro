import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getQuotes, type QuoteData } from "@/lib/market/yahoo";

export const dynamic = "force-dynamic";

function formatCurrency(n: number) {
  const prefix = n >= 0 ? "+$" : "-$";
  return prefix + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatLegType(type: string) {
  const labels: Record<string, string> = {
    leaps_call: "LEAPS Call",
    short_call: "Short Call",
    short_put: "Short Put",
    shares: "Shares",
    long_put: "Long Put",
  };
  return labels[type] || type;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-stone-100 text-stone-600" },
    closed: { label: "Closed", color: "bg-stone-100 text-stone-400" },
    rolled: { label: "Rolled", color: "bg-amber-50 text-amber-700" },
  };
  const { label, color } = config[status] || config.active;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}

function computeLegPnl(
  leg: { type: string; strike: number; entry_price: number; quantity: number; expiry: string },
  currentPrice: number
) {
  const qty = leg.quantity || 1;
  const multiplier = 100; // options contract multiplier

  switch (leg.type) {
    case "shares":
      return (currentPrice - leg.entry_price) * qty;
    case "leaps_call": {
      // Long call: approximate P&L based on intrinsic value vs entry
      const intrinsic = Math.max(0, currentPrice - leg.strike);
      return (intrinsic - leg.entry_price) * qty * multiplier;
    }
    case "short_call": {
      // Short call: premium collected minus current intrinsic
      const intrinsic = Math.max(0, currentPrice - leg.strike);
      return (leg.entry_price - intrinsic) * qty * multiplier;
    }
    case "short_put": {
      // Short put: premium collected minus current intrinsic
      const intrinsic = Math.max(0, leg.strike - currentPrice);
      return (leg.entry_price - intrinsic) * qty * multiplier;
    }
    case "long_put": {
      const intrinsic = Math.max(0, leg.strike - currentPrice);
      return (intrinsic - leg.entry_price) * qty * multiplier;
    }
    default:
      return 0;
  }
}

function daysFromEntry(entryDate: string | null) {
  if (!entryDate) return 0;
  const entry = new Date(entryDate);
  const now = new Date();
  return Math.max(0, Math.ceil((now.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)));
}

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const positions = await getPositions(user.id);

  // Fetch live quotes for all unique symbols
  const uniqueSymbols = [...new Set(positions.map((p: { symbol: string }) => p.symbol))];
  const quotes = uniqueSymbols.length > 0 ? await getQuotes(uniqueSymbols) : [];
  const quoteMap = new Map<string, QuoteData>();
  for (const q of quotes) {
    quoteMap.set(q.symbol, q);
  }

  // Calculate per-position P&L and totals
  type PositionWithPnl = {
    id: string;
    symbol: string;
    strategy: string;
    status: string;
    entry_date: string | null;
    notes: string | null;
    trailing_stop_pct: number | null;
    peak_price: number | null;
    entry_price_per_share: number | null;
    position_legs: Array<{
      id: string;
      type: string;
      strike: number;
      expiry: string;
      entry_price: number;
      quantity: number;
    }>;
    quote: QuoteData | undefined;
    totalPnl: number;
    premiumCollected: number;
    daysOpen: number;
    gainFromEntry: number | null;
    pctFromPeak: number | null;
    drawdownTriggered: boolean;
    legDetails: Array<{
      description: string;
      pnl: number;
    }>;
  };

  const enrichedPositions: PositionWithPnl[] = positions.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pos: any) => {
      const quote = quoteMap.get(pos.symbol);
      const currentPrice = quote?.price ?? 0;
      const legs = pos.position_legs || [];

      let totalPnl = 0;
      let premiumCollected = 0;
      const legDetails: Array<{ description: string; pnl: number }> = [];

      for (const leg of legs) {
        const pnl = currentPrice > 0 ? computeLegPnl(leg, currentPrice) : 0;
        totalPnl += pnl;

        // Track premium collected from short legs
        if (leg.type === "short_call" || leg.type === "short_put") {
          premiumCollected += leg.entry_price * (leg.quantity || 1) * 100;
        }

        const expiryLabel = leg.expiry
          ? new Date(leg.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";

        const desc =
          leg.type === "shares"
            ? `${leg.quantity} shares @ $${leg.entry_price.toFixed(2)}`
            : `${formatLegType(leg.type)} $${leg.strike} ${expiryLabel} @ $${leg.entry_price.toFixed(2)}`;

        legDetails.push({ description: desc, pnl: Math.round(pnl) });
      }

      // Gain from entry and drawdown tracking
      const entryPPS = pos.entry_price_per_share as number | null;
      const peakP = pos.peak_price as number | null;
      const trailingPct = pos.trailing_stop_pct as number | null;

      const gainFromEntry =
        entryPPS && entryPPS > 0 && currentPrice > 0
          ? ((currentPrice - entryPPS) / entryPPS) * 100
          : null;

      const pctFromPeak =
        peakP && peakP > 0 && currentPrice > 0
          ? ((currentPrice - peakP) / peakP) * 100
          : null;

      const drawdownTriggered =
        trailingPct != null && pctFromPeak != null && pctFromPeak <= -trailingPct;

      return {
        id: pos.id,
        symbol: pos.symbol,
        strategy: pos.strategy,
        status: pos.status,
        entry_date: pos.entry_date,
        notes: pos.notes,
        trailing_stop_pct: trailingPct,
        peak_price: peakP,
        entry_price_per_share: entryPPS,
        position_legs: legs,
        quote,
        totalPnl: Math.round(totalPnl),
        premiumCollected: Math.round(premiumCollected),
        daysOpen: daysFromEntry(pos.entry_date),
        gainFromEntry,
        pctFromPeak,
        drawdownTriggered,
        legDetails,
      };
    }
  );

  const activePositions = enrichedPositions.filter((p) => p.status === "active");
  const totalPnl = enrichedPositions.reduce((sum, p) => sum + p.totalPnl, 0);
  const totalPremium = enrichedPositions.reduce((sum, p) => sum + p.premiumCollected, 0);

  // Gain tracking summary
  const positionsWithGain = activePositions.filter((p) => p.gainFromEntry != null);
  const bestPerformer = positionsWithGain.length > 0
    ? positionsWithGain.reduce((best, p) => (p.gainFromEntry! > (best.gainFromEntry ?? -Infinity) ? p : best))
    : null;
  const totalGainPct = positionsWithGain.length > 0
    ? positionsWithGain.reduce((sum, p) => sum + p.gainFromEntry!, 0) / positionsWithGain.length
    : null;
  const positionsAtRisk = activePositions.filter(
    (p) => p.pctFromPeak != null && p.pctFromPeak <= -5
  );

  if (positions.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5">
        <h2 className="text-lg font-bold text-stone-900 mb-5">Portfolio</h2>

        {/* Strategy links */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/covered-calls" className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-900">Covered Calls</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Optimize strikes</p>
          </Link>
          <Link href="/wheel" className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-900">The Wheel</p>
            <p className="text-[10px] text-stone-400 mt-0.5">View cycles</p>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-16">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-stone-700 mb-1">No positions yet</p>
          <p className="text-xs text-stone-400 mb-4">Add your first options position to get started.</p>
          <Link
            href="/positions/new"
            className="text-xs font-semibold text-white bg-stone-900 px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Add Position
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Summary */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-stone-900">Portfolio</h2>
        <span className="text-xs text-stone-400">{activePositions.length} active</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Total P&L</p>
          <p className={`text-xl font-bold mt-1 ${totalPnl >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Premium</p>
          <p className="text-xl font-bold mt-1 text-stone-900">
            ${totalPremium.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Active</p>
          <p className="text-xl font-bold mt-1 text-stone-900">
            {activePositions.length}
          </p>
        </div>
      </div>

      {/* Gain tracking summary */}
      {positionsWithGain.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">Best Performer</p>
            {bestPerformer ? (
              <>
                <p className="text-sm font-bold mt-1 text-emerald-700">{bestPerformer.symbol}</p>
                <p className="text-[10px] text-emerald-600">+{bestPerformer.gainFromEntry!.toFixed(1)}%</p>
              </>
            ) : (
              <p className="text-sm font-bold mt-1 text-stone-400">--</p>
            )}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">Avg Gain</p>
            <p className={`text-xl font-bold mt-1 ${totalGainPct != null && totalGainPct >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {totalGainPct != null ? `${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(1)}%` : "--"}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider">At Risk</p>
            <p className={`text-xl font-bold mt-1 ${positionsAtRisk.length > 0 ? "text-red-600" : "text-stone-900"}`}>
              {positionsAtRisk.length}
            </p>
            {positionsAtRisk.length > 0 && (
              <p className="text-[10px] text-red-500">&gt;5% drawdown</p>
            )}
          </div>
        </div>
      )}

      {/* Positions at risk alert */}
      {positionsAtRisk.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-5">
          <p className="text-xs font-semibold text-red-700 mb-1">Drawdown Warning</p>
          <p className="text-[10px] text-red-600">
            {positionsAtRisk.map((p) => `${p.symbol} (${p.pctFromPeak!.toFixed(1)}%)`).join(", ")} pulling back from peak
          </p>
        </div>
      )}

      {/* Strategy links */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/covered-calls" className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900">Covered Calls</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Optimize strikes</p>
        </Link>
        <Link href="/wheel" className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900">The Wheel</p>
          <p className="text-[10px] text-stone-400 mt-0.5">View cycles</p>
        </Link>
      </div>

      {/* Positions */}
      <div className="flex flex-col gap-3">
        {enrichedPositions.map((pos) => (
          <div key={pos.id} className={`rounded-xl border p-4 ${
            pos.drawdownTriggered
              ? "border-red-300 bg-red-50/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
              : pos.pctFromPeak != null && pos.pctFromPeak <= -5
                ? "border-amber-300 bg-amber-50/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]"
                : pos.gainFromEntry != null && pos.gainFromEntry >= 50
                  ? "border-emerald-300 bg-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "border-stone-200 bg-white"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">{pos.symbol}</span>
                <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                  {pos.strategy}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pos.quote && (
                  <span className="text-[10px] text-stone-400">
                    ${pos.quote.price.toFixed(2)}
                  </span>
                )}
                <StatusBadge status={pos.status} />
              </div>
            </div>

            {/* Legs */}
            <div className="flex flex-col gap-1.5 mb-3">
              {pos.legDetails.map((leg, j) => (
                <div key={j} className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 truncate mr-2">{leg.description}</span>
                  <span className={`font-semibold shrink-0 ${leg.pnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {leg.pnl >= 0 ? "+" : ""}{leg.pnl}
                  </span>
                </div>
              ))}
            </div>

            {/* Gain & Drawdown Tracking */}
            {(pos.gainFromEntry != null || pos.pctFromPeak != null) && (
              <div className={`flex items-center gap-3 mb-3 p-2 rounded-lg ${
                pos.drawdownTriggered
                  ? "bg-red-50 ring-1 ring-red-200"
                  : pos.pctFromPeak != null && pos.pctFromPeak <= -5
                    ? "bg-amber-50 ring-1 ring-amber-200"
                    : pos.gainFromEntry != null && pos.gainFromEntry >= 50
                      ? "bg-emerald-50 ring-1 ring-emerald-200"
                      : "bg-stone-50"
              }`}>
                {pos.gainFromEntry != null && (
                  <div className="flex-1">
                    <p className="text-[10px] text-stone-400">Gain from Entry</p>
                    <p className={`text-sm font-bold ${
                      pos.gainFromEntry >= 50
                        ? "text-emerald-600"
                        : pos.gainFromEntry >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                    }`}>
                      {pos.gainFromEntry >= 0 ? "+" : ""}{pos.gainFromEntry.toFixed(1)}%
                    </p>
                  </div>
                )}
                {pos.pctFromPeak != null && (
                  <div className="flex-1">
                    <p className="text-[10px] text-stone-400">From Peak</p>
                    <p className={`text-sm font-bold ${
                      pos.drawdownTriggered
                        ? "text-red-600"
                        : pos.pctFromPeak <= -5
                          ? "text-amber-600"
                          : "text-stone-600"
                    }`}>
                      {pos.pctFromPeak.toFixed(1)}%
                    </p>
                  </div>
                )}
                {pos.drawdownTriggered && (
                  <div className="flex-1 text-right">
                    <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      STOP TRIGGERED
                    </span>
                  </div>
                )}
                {!pos.drawdownTriggered && pos.trailing_stop_pct != null && (
                  <div className="flex-1 text-right">
                    <p className="text-[10px] text-stone-400">Trail Stop</p>
                    <p className="text-xs font-semibold text-stone-600">{pos.trailing_stop_pct}%</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-stone-400">P&L</p>
                  <p className={`text-sm font-bold ${pos.totalPnl >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatCurrency(pos.totalPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-400">Premium</p>
                  <p className="text-sm font-bold text-stone-900">${pos.premiumCollected.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-stone-400">{pos.daysOpen}d open</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
