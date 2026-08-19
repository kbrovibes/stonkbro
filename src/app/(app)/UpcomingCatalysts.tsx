import Link from "next/link";

export type EarningsPill = {
  symbol: string;
  earningsDate: string;
  daysUntil: number;
  timing: string;
  category: string;
};

interface Props {
  earnings: EarningsPill[];
}

export default function UpcomingCatalysts({ earnings }: Props) {
  if (earnings.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <h2 className="text-[17px] font-bold tracking-[-0.01em] text-stone-900 dark:text-text">
          Upcoming Catalysts
        </h2>
        <Link
          href="/earnings"
          className="text-xs font-semibold text-sky-600 dark:text-accent hover:text-sky-800 transition-colors"
        >
          Full Calendar
        </Link>
      </div>

      {/* Monochrome pills — urgency lives in the day-count color, not the surface. */}
      <div className="flex flex-wrap gap-1.5">
        {earnings.map((e) => (
          <Link
            key={`er-${e.symbol}`}
            href={`/suggestions/${e.symbol}`}
            className="hood-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-stone-200 dark:border-border-subtle bg-stone-50 dark:bg-surface-muted text-[11px] transition-colors hover:border-stone-300 dark:hover:border-border-default"
          >
            <span className="font-bold text-stone-900 dark:text-text">{e.symbol}</span>
            <span
              className={`font-semibold tabular-nums ${
                e.category === "this_week"
                  ? "text-rose-600 dark:text-loss"
                  : "text-stone-400 dark:text-text-subtle"
              }`}
            >
              {e.daysUntil === 0 ? "today" : e.daysUntil === 1 ? "tmrw" : `${e.daysUntil}d`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
