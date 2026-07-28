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
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-stone-800 dark:text-text">Upcoming Catalysts</span>
        <Link
          href="/earnings"
          className="text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-700"
        >
          Full Calendar
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {earnings.map((e) => (
          <Link
            key={`er-${e.symbol}`}
            href={`/suggestions/${e.symbol}`}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors hover:opacity-80 ${
              e.category === "this_week"
                ? "bg-red-50 dark:bg-loss-bg text-red-700 dark:text-loss-strong"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            <span className="font-bold">{e.symbol}</span>
            <span className="opacity-70">
              {e.daysUntil === 0 ? "today" : e.daysUntil === 1 ? "tmrw" : `${e.daysUntil}d`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
