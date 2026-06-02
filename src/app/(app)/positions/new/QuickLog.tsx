"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createPositionAction } from "../actions";

type LegData = {
  type: string;
  strike: number;
  expiry: string;
  price: number;
  quantity?: number;
};

type QuickLogProps = {
  symbol: string;
  strategy: string;
  legs: LegData[];
  onEdit: () => void;
};

function legLabel(type: string): string {
  const map: Record<string, string> = {
    short_put: "Sell Put",
    short_call: "Sell Call",
    leaps_call: "Buy LEAPS Call",
    long_put: "Buy Put",
    shares: "Buy Shares",
  };
  return map[type] ?? type;
}

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QuickLog({
  symbol,
  strategy,
  legs,
  onEdit,
}: QuickLogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleConfirm() {
    setError("");

    const formData = new FormData();
    formData.set("symbol", symbol.toUpperCase().trim());
    formData.set("strategy", strategy);

    const parsedLegs = legs.map((leg) => ({
      type: leg.type,
      strike: leg.strike,
      expiry: leg.expiry,
      entry_price: leg.price,
      quantity: leg.quantity ?? 1,
    }));
    formData.set("legs", JSON.stringify(parsedLegs));

    startTransition(async () => {
      try {
        await createPositionAction(formData);
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to log position");
      }
    });
  }

  // Compute total income for simple strategies
  const totalIncome = legs.reduce((sum, leg) => {
    if (leg.type === "short_put" || leg.type === "short_call") {
      return sum + leg.price * 100 * (leg.quantity ?? 1);
    }
    return sum;
  }, 0);

  if (success) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-gain-bg flex items-center justify-center">
            <svg
              className="w-7 h-7 text-emerald-600 dark:text-gain"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-stone-900 dark:text-text">Position Logged</p>
            <p className="text-xs text-stone-500 dark:text-text-subtle mt-1">
              {symbol} {strategy} has been added
            </p>
          </div>
          <Link
            href="/positions"
            className="text-xs font-semibold text-sky-600 dark:text-accent hover:text-sky-700 transition-colors"
          >
            View Positions
          </Link>
        </div>
      </div>
    );
  }

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
        <h2 className="text-lg font-bold text-stone-900 dark:text-text">Log Trade</h2>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-loss-border bg-red-50 dark:bg-loss-bg p-3 mb-4">
          <p className="text-xs text-red-600 dark:text-loss">{error}</p>
        </div>
      )}

      {/* Quick Log Card */}
      <div className="rounded-xl border-2 border-sky-200 dark:border-accent-border bg-white dark:bg-surface-elevated p-5 shadow-sm">
        {/* Symbol + Strategy */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base font-bold text-stone-900 dark:text-text">{symbol}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted">
            {strategy}
          </span>
        </div>

        {/* Legs */}
        <div className="flex flex-col gap-3 mb-4">
          {legs.map((leg, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-stone-800 dark:text-text">
                {legLabel(leg.type)}
                {leg.type !== "shares" && ` $${leg.strike}`}
              </p>
              <p className="text-xs text-stone-500 dark:text-text-subtle">
                {leg.expiry && `Expires ${formatExpiry(leg.expiry)}`}
                {leg.price > 0 &&
                  ` \u00B7 ${leg.type === "shares" ? "Cost basis" : "Premium"} $${leg.price.toFixed(2)}`}
                {(leg.quantity ?? 1) > 1 &&
                  ` \u00B7 ${leg.quantity} ${leg.type === "shares" ? "shares" : "contracts"}`}
              </p>
            </div>
          ))}
        </div>

        {/* Income summary */}
        {totalIncome > 0 && (
          <div className="border-t border-stone-100 dark:border-border-subtle pt-3 mb-5">
            <p className="text-xs text-stone-500 dark:text-text-subtle">
              Income:{" "}
              <span className="font-bold text-emerald-600 dark:text-gain">
                ${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>{" "}
              per contract
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 text-xs font-semibold text-white bg-stone-900 dark:bg-surface-elevated hover:bg-stone-800 dark:hover:bg-surface-muted disabled:bg-stone-300 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
          >
            {isPending ? "Logging..." : "Confirm & Log"}
          </button>
          <button
            onClick={onEdit}
            disabled={isPending}
            className="text-xs font-semibold text-stone-600 dark:text-text-muted bg-stone-100 dark:bg-surface-muted hover:bg-stone-200 dark:hover:bg-surface-sunken disabled:opacity-50 px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Edit Details &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
