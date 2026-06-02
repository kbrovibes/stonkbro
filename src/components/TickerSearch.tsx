"use client";

import { useState, useTransition } from "react";
import { addTickerAction } from "@/app/(app)/watchlists/actions";

interface TickerSearchProps {
  watchlistId: string;
}

export default function TickerSearch({ watchlistId }: TickerSearchProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const symbol = value.toUpperCase().trim();
    if (!symbol) return;
    if (symbol.length > 5 || !/^[A-Z]+$/.test(symbol)) {
      setError("Enter a valid ticker (1-5 letters)");
      return;
    }

    startTransition(async () => {
      try {
        await addTickerAction(watchlistId, symbol);
        setValue("");
      } catch {
        setError("Failed to add ticker");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="Add ticker, e.g. AAPL"
          maxLength={5}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated text-stone-900 dark:text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-stone-900 dark:bg-surface-elevated text-white hover:bg-stone-800 dark:hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-loss">{error}</p>}
    </form>
  );
}
