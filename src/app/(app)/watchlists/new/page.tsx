import Link from "next/link";
import { createWatchlistAction } from "../actions";

export default function NewWatchlistPage() {
  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/watchlists"
          className="w-8 h-8 rounded-lg border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated flex items-center justify-center hover:border-stone-300 transition-colors"
        >
          <svg
            className="w-4 h-4 text-stone-500 dark:text-text-subtle"
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
        <h2 className="text-lg font-bold text-stone-900 dark:text-text">New Watchlist</h2>
      </div>

      <form action={createWatchlistAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-stone-700 dark:text-text-muted"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Tech Stocks"
            maxLength={50}
            className="px-3 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated text-stone-900 dark:text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 text-sm font-semibold rounded-xl bg-stone-900 dark:bg-surface-elevated text-white hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
        >
          Create Watchlist
        </button>
      </form>
    </div>
  );
}
