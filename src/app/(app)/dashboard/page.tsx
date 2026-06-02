import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getQuotes, type QuoteData } from "@/lib/market/yahoo";

export const dynamic = "force-dynamic";

function formatCurrency(n: number) {
  const prefix = n >= 0 ? "+$" : "-$";
  return prefix + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function computeLegPnl(
  leg: { type: string; strike: number; entry_price: number; quantity: number },
  currentPrice: number
) {
  const qty = leg.quantity || 1;
  const multiplier = 100;
  switch (leg.type) {
    case "shares":
      return (currentPrice - leg.entry_price) * qty;
    case "leaps_call": {
      const intrinsic = Math.max(0, currentPrice - leg.strike);
      return (intrinsic - leg.entry_price) * qty * multiplier;
    }
    case "short_call": {
      const intrinsic = Math.max(0, currentPrice - leg.strike);
      return (leg.entry_price - intrinsic) * qty * multiplier;
    }
    case "short_put": {
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let positions: any[] = [];
  try {
    positions = await getPositions(user.id);
  } catch {
    // DB may not be set up
  }

  const activePositions = positions.filter((p: { status: string }) => p.status === "active");
  const uniqueSymbols = [...new Set(activePositions.map((p: { symbol: string }) => p.symbol))];
  const quotes = uniqueSymbols.length > 0 ? await getQuotes(uniqueSymbols) : [];
  const quoteMap = new Map<string, QuoteData>();
  for (const q of quotes) quoteMap.set(q.symbol, q);

  // Calculate total P&L and income
  let totalPnl = 0;
  let totalPremium = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stopWarnings: { symbol: string; pctFromPeak: number }[] = [];

  for (const pos of activePositions) {
    const quote = quoteMap.get(pos.symbol);
    const currentPrice = quote?.price ?? 0;
    const legs = pos.position_legs ?? [];

    for (const leg of legs) {
      if (currentPrice > 0) totalPnl += computeLegPnl(leg, currentPrice);
      if (leg.type === "short_call" || leg.type === "short_put") {
        totalPremium += Math.abs(leg.entry_price) * (leg.quantity ?? 1) * 100;
      }
    }

    // Check trailing stop warnings
    const peakPrice = pos.peak_price as number | null;
    const trailingPct = pos.trailing_stop_pct as number | null;
    if (peakPrice && trailingPct && currentPrice > 0) {
      const pctFromPeak = ((currentPrice - peakPrice) / peakPrice) * 100;
      if (pctFromPeak <= -(trailingPct * 0.7)) {
        stopWarnings.push({ symbol: pos.symbol, pctFromPeak });
      }
    }
  }

  totalPnl = Math.round(totalPnl);
  totalPremium = Math.round(totalPremium);

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <h2 className="text-lg font-bold text-stone-900 dark:text-text mb-1">Dashboard</h2>
      <p className="text-xs text-stone-400 dark:text-text-faint mb-5">Your home base</p>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">Active</p>
          <p className="text-xl font-bold mt-1 text-stone-900 dark:text-text">{activePositions.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">Total P&L</p>
          <p className={`text-xl font-bold mt-1 ${totalPnl >= 0 ? "text-emerald-700 dark:text-gain-strong" : "text-red-600 dark:text-loss"}`}>
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">Income</p>
          <p className="text-xl font-bold mt-1 text-stone-900 dark:text-text">${totalPremium.toLocaleString()}</p>
        </div>
      </div>

      {/* Trailing Stop Warnings */}
      {stopWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Positions Approaching Stop</p>
          </div>
          <div className="flex flex-col gap-1">
            {stopWarnings.map((w) => (
              <Link key={w.symbol} href="/portfolio" className="flex items-center justify-between text-xs hover:bg-amber-100 rounded-lg px-2 py-1 -mx-2 transition-colors">
                <span className="font-semibold text-amber-800 dark:text-amber-200">{w.symbol}</span>
                <span className="text-amber-600 dark:text-amber-300">{w.pctFromPeak.toFixed(1)}% from peak</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/portfolio" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900 dark:text-text">Portfolio</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Gain & drawdown tracking</p>
        </Link>
        <Link href="/positions/new" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900 dark:text-text">Add Position</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Track a new trade</p>
        </Link>
        <Link href="/pmcc-picks" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900 dark:text-text">PMCC Picks</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Top setups today</p>
        </Link>
        <Link href="/explosive" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
          <p className="text-xs font-bold text-stone-900 dark:text-text">Explosive Finder</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Breakout candidates</p>
        </Link>
      </div>

      {/* Recent Positions */}
      {activePositions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-text">Active Positions</h3>
            <Link href="/portfolio" className="text-[10px] text-stone-400 dark:text-text-faint hover:text-stone-600">
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {activePositions.slice(0, 5).map((pos: { id: string; symbol: string; strategy: string; peak_price: number | null; entry_price_per_share: number | null }) => {
              const quote = quoteMap.get(pos.symbol);
              const currentPrice = quote?.price ?? 0;
              const entryPPS = pos.entry_price_per_share;
              const gainPct = entryPPS && entryPPS > 0 && currentPrice > 0
                ? ((currentPrice - entryPPS) / entryPPS) * 100
                : null;
              const peakP = pos.peak_price;
              const fromPeak = peakP && peakP > 0 && currentPrice > 0
                ? ((currentPrice - peakP) / peakP) * 100
                : null;

              return (
                <Link key={pos.id} href="/portfolio" className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-stone-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900 dark:text-text">{pos.symbol}</span>
                    <span className="text-[10px] text-stone-400 dark:text-text-faint bg-stone-100 dark:bg-surface-muted px-1.5 py-0.5 rounded-full">{pos.strategy}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {gainPct != null && (
                      <span className={`text-xs font-semibold ${gainPct >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"}`}>
                        {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                      </span>
                    )}
                    {fromPeak != null && fromPeak <= -5 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-300 font-semibold">
                        {fromPeak.toFixed(1)}% peak
                      </span>
                    )}
                    {quote && (
                      <span className="text-xs text-stone-400 dark:text-text-faint">${quote.price.toFixed(2)}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Explore */}
      <div>
        <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-3">Explore</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/sectors" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-900 dark:text-text">Sectors</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Market themes</p>
          </Link>
          <Link href="/research" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-900 dark:text-text">Research</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">AI reports</p>
          </Link>
          <Link href="/signals" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-900 dark:text-text">Trade Signals</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Roll & close alerts</p>
          </Link>
          <Link href="/income" className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3 hover:border-stone-300 transition-colors">
            <p className="text-xs font-bold text-stone-900 dark:text-text">Income</p>
            <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Premium tracking</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
