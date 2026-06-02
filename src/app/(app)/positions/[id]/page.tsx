import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPosition } from "@/lib/db/positions";
import { getQuote } from "@/lib/market/yahoo";
import { notFound } from "next/navigation";
import StatusActions from "./StatusActions";
import TrailingStopConfig from "./TrailingStopConfig";

function legLabel(type: string) {
  const map: Record<string, string> = {
    leaps_call: "LEAPS Call",
    short_call: "Short Call",
    short_put: "Short Put",
    shares: "Shares",
    long_put: "Long Put",
  };
  return map[type] ?? type;
}

function legTypeBadge(type: string) {
  const map: Record<string, string> = {
    leaps_call: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    short_call: "bg-red-50 dark:bg-loss-bg text-red-600 dark:text-loss",
    short_put: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    shares: "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
    long_put: "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  };
  return map[type] ?? "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted";
}

function strategyBadgeClass(strategy: string) {
  const map: Record<string, string> = {
    PMCC: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    "Covered Call": "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
    "Cash-Secured Put": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    "The Wheel": "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  };
  return map[strategy] ?? "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted";
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted" },
    closed: { label: "Closed", cls: "bg-stone-200 dark:bg-surface-sunken text-stone-500 dark:text-text-subtle" },
    rolled: { label: "Rolled", cls: "bg-sky-50 dark:bg-accent-bg text-sky-600 dark:text-accent" },
  };
  return map[status] ?? map.active;
}

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let position: any;
  try {
    position = await getPosition(id);
  } catch {
    notFound();
  }

  if (!position) notFound();

  // Fetch live quote for trailing stop
  const quote = await getQuote(position.symbol);
  const currentPrice = quote?.price ?? 0;

  // Update peak price if current price is higher
  if (
    position.trailing_stop_pct !== null &&
    position.peak_price !== null &&
    currentPrice > position.peak_price
  ) {
    const { updatePeakPrice } = await import("@/lib/db/positions");
    await updatePeakPrice(position.id, currentPrice);
    position.peak_price = currentPrice;
  }

  const legs = position.position_legs ?? [];
  const status = position.status ?? "active";
  const { label: statusLabel, cls: statusCls } = statusConfig(status);
  const days = position.entry_date
    ? daysSince(position.entry_date)
    : position.created_at
      ? daysSince(position.created_at)
      : 0;

  const totalPremium = legs
    .filter(
      (l: { type: string }) => l.type === "short_call" || l.type === "short_put"
    )
    .reduce(
      (sum: number, l: { entry_price: number; quantity?: number }) =>
        sum + Math.abs(l.entry_price) * (l.quantity ?? 1) * 100,
      0
    );

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/positions"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 dark:bg-surface-muted hover:bg-stone-200 dark:hover:bg-surface-sunken transition-colors"
        >
          <svg
            className="w-4 h-4 text-stone-600 dark:text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900 dark:text-text">
              {position.symbol}
            </h2>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${strategyBadgeClass(position.strategy)}`}
            >
              {position.strategy}
            </span>
          </div>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Premium
          </p>
          <p className="text-base font-bold mt-1 text-stone-900 dark:text-text">
            ${totalPremium.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Days Open
          </p>
          <p className="text-base font-bold mt-1 text-stone-900 dark:text-text">{days}</p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Legs
          </p>
          <p className="text-base font-bold mt-1 text-stone-900 dark:text-text">
            {legs.length}
          </p>
        </div>
      </div>

      {/* Legs */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-stone-700 dark:text-text-muted uppercase tracking-wider">
            Legs
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {legs.map(
            (leg: {
              id: string;
              type: string;
              strike: number;
              expiry: string;
              entry_price: number;
              quantity?: number;
            }) => {
              const daysToExpiry = Math.floor(
                (new Date(leg.expiry).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const isExpired = daysToExpiry < 0;

              return (
                <div
                  key={leg.id}
                  className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${legTypeBadge(leg.type)}`}
                      >
                        {legLabel(leg.type)}
                      </span>
                      {leg.type !== "shares" && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            isExpired
                              ? "bg-red-50 dark:bg-loss-bg text-red-500 dark:text-loss"
                              : daysToExpiry <= 7
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300"
                                : "bg-stone-50 dark:bg-surface text-stone-400 dark:text-text-faint"
                          }`}
                        >
                          {isExpired
                            ? "Expired"
                            : `${daysToExpiry}d to exp`}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-stone-400 dark:text-text-faint">
                      x{leg.quantity ?? 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {leg.type !== "shares" && (
                      <div>
                        <p className="text-[10px] text-stone-400 dark:text-text-faint">Strike</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-text">
                          ${leg.strike}
                        </p>
                      </div>
                    )}
                    {leg.type !== "shares" && (
                      <div>
                        <p className="text-[10px] text-stone-400 dark:text-text-faint">Expiry</p>
                        <p className="text-sm font-bold text-stone-900 dark:text-text">
                          {new Date(leg.expiry).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-stone-400 dark:text-text-faint">
                        {leg.type === "shares" ? "Cost Basis" : "Entry"}
                      </p>
                      <p className="text-sm font-bold text-stone-900 dark:text-text">
                        ${Math.abs(leg.entry_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Notes */}
      {position.notes && (
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4 mb-5">
          <h3 className="text-xs font-bold text-stone-700 dark:text-text-muted uppercase tracking-wider mb-2">
            Notes
          </h3>
          <p className="text-sm text-stone-600 dark:text-text-muted whitespace-pre-wrap">
            {position.notes}
          </p>
        </div>
      )}

      {/* Entry info */}
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4 mb-5">
        <h3 className="text-xs font-bold text-stone-700 dark:text-text-muted uppercase tracking-wider mb-2">
          Details
        </h3>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400 dark:text-text-faint">Opened</span>
            <span className="text-stone-700 dark:text-text-muted font-medium">
              {position.entry_date
                ? new Date(position.entry_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400 dark:text-text-faint">Status</span>
            <span className="text-stone-700 dark:text-text-muted font-medium">{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400 dark:text-text-faint">Strategy</span>
            <span className="text-stone-700 dark:text-text-muted font-medium">
              {position.strategy}
            </span>
          </div>
        </div>
      </div>

      {/* Live Price & Gain Summary */}
      {quote && (
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4 mb-5">
          <h3 className="text-xs font-bold text-stone-700 dark:text-text-muted uppercase tracking-wider mb-2">
            Live Quote
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-stone-400 dark:text-text-faint">Price</p>
              <p className="text-sm font-bold text-stone-900 dark:text-text">
                ${currentPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 dark:text-text-faint">Change</p>
              <p
                className={`text-sm font-bold ${
                  quote.changePct >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-600 dark:text-loss"
                }`}
              >
                {quote.changePct >= 0 ? "+" : ""}
                {quote.changePct.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 dark:text-text-faint">Volume</p>
              <p className="text-sm font-bold text-stone-900 dark:text-text">
                {quote.volumeRatio.toFixed(1)}x avg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trailing Stop */}
      {status === "active" && (
        <div className="mb-5">
          <TrailingStopConfig
            positionId={id}
            symbol={position.symbol}
            currentPrice={currentPrice}
            trailingStopPct={position.trailing_stop_pct ?? null}
            peakPrice={position.peak_price ?? null}
            entryPricePerShare={position.entry_price_per_share ?? null}
          />
        </div>
      )}

      {/* Actions */}
      <StatusActions positionId={id} currentStatus={status} />
    </div>
  );
}
