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

      return {
        id: pos.id,
        symbol: pos.symbol,
        strategy: pos.strategy,
        status: pos.status,
        entry_date: pos.entry_date,
        notes: pos.notes,
        position_legs: legs,
        quote,
        totalPnl: Math.round(totalPnl),
        premiumCollected: Math.round(premiumCollected),
        daysOpen: daysFromEntry(pos.entry_date),
        legDetails,
      };
    }
  );

  const activePositions = enrichedPositions.filter((p) => p.status === "active");
  const totalPnl = enrichedPositions.reduce((sum, p) => sum + p.totalPnl, 0);
  const totalPremium = enrichedPositions.reduce((sum, p) => sum + p.premiumCollected, 0);

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
          <div key={pos.id} className="rounded-xl border border-stone-200 bg-white p-4">
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
