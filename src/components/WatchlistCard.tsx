import Link from "next/link";

interface WatchlistCardProps {
  id: string;
  name: string;
  itemCount: number;
  isDefault: boolean;
}

export default function WatchlistCard({
  id,
  name,
  itemCount,
  isDefault,
}: WatchlistCardProps) {
  return (
    <Link
      href={`/watchlists/${id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-stone-300 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-surface-muted flex items-center justify-center shrink-0">
        <svg
          className="w-4 h-4 text-stone-500 dark:text-text-subtle"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-900 dark:text-text">{name}</span>
          {isDefault && (
            <span className="text-[10px] font-semibold text-stone-500 dark:text-text-subtle bg-stone-100 dark:bg-surface-muted px-1.5 py-0.5 rounded-full">
              Default
            </span>
          )}
        </div>
        <span className="text-xs text-stone-400 dark:text-text-faint">
          {itemCount} {itemCount === 1 ? "ticker" : "tickers"}
        </span>
      </div>

      <svg
        className="w-4 h-4 text-stone-300 dark:text-text-faint shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8.25 4.5 7.5 7.5-7.5 7.5"
        />
      </svg>
    </Link>
  );
}
