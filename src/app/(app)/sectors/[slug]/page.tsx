import Link from "next/link";
import { notFound } from "next/navigation";
import { getSector } from "@/lib/market/sectors";
import { getQuotes } from "@/lib/market/yahoo";

export const dynamic = "force-dynamic";

const colorMap: Record<string, { bg: string; border: string; text: string; tag: string }> = {
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", tag: "bg-violet-100 text-violet-700" },
  sky: { bg: "bg-sky-50 dark:bg-accent-bg", border: "border-sky-200 dark:border-accent-border", text: "text-sky-700 dark:text-accent-hover", tag: "bg-sky-100 dark:bg-accent-bg text-sky-700 dark:text-accent-hover" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", tag: "bg-indigo-100 text-indigo-700" },
  emerald: { bg: "bg-emerald-50 dark:bg-gain-bg", border: "border-emerald-200 dark:border-gain-border", text: "text-emerald-700 dark:text-gain-strong", tag: "bg-emerald-100 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", tag: "bg-amber-100 text-amber-700" },
  rose: { bg: "bg-rose-50 dark:bg-loss-bg", border: "border-rose-200", text: "text-rose-700 dark:text-loss-strong", tag: "bg-rose-100 text-rose-700 dark:text-loss-strong" },
  lime: { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-700", tag: "bg-lime-100 text-lime-700" },
};

function formatVolume(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

function formatMarketCap(mc: number): string {
  if (mc >= 1_000_000_000_000) return "$" + (mc / 1_000_000_000_000).toFixed(1) + "T";
  if (mc >= 1_000_000_000) return "$" + (mc / 1_000_000_000).toFixed(1) + "B";
  if (mc >= 1_000_000) return "$" + (mc / 1_000_000).toFixed(0) + "M";
  return "$" + mc.toLocaleString();
}

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sector = getSector(slug);

  if (!sector) notFound();

  const colors = colorMap[sector.color] ?? colorMap.violet;
  const quotes = await getQuotes(sector.tickers);

  // Sort by change% descending
  const sortedQuotes = [...quotes].sort((a, b) => b.changePct - a.changePct);

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      {/* Back link */}
      <Link
        href="/sectors"
        className="flex items-center gap-1 text-xs font-medium text-stone-500 dark:text-text-subtle hover:text-stone-700 transition-colors w-fit"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Sectors
      </Link>

      {/* Header */}
      <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
        <h2 className={`text-lg font-extrabold ${colors.text}`}>{sector.name}</h2>
        <p className="text-xs text-stone-600 dark:text-text-muted mt-1 leading-relaxed">{sector.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {sector.catalysts.map((catalyst) => (
            <span
              key={catalyst}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.tag}`}
            >
              {catalyst}
            </span>
          ))}
        </div>
      </div>

      {/* AI Research button */}
      <Link
        href={`/explosive?sector=${slug}`}
        className="w-full py-3 rounded-xl bg-stone-900 dark:bg-surface-elevated text-white text-sm font-semibold text-center hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
        </svg>
        Run AI Research on This Sector
      </Link>

      {/* Ticker list */}
      <div>
        <p className="text-xs font-semibold text-stone-500 dark:text-text-subtle uppercase tracking-wide mb-2.5">
          {sortedQuotes.length} Tickers
        </p>
        <div className="flex flex-col gap-2">
          {sortedQuotes.map((q) => (
            <Link
              key={q.symbol}
              href={`/ticker/${q.symbol}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-stone-300 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-text">{q.symbol}</span>
                  <span className="text-[10px] text-stone-400 dark:text-text-faint truncate max-w-[140px]">{q.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-stone-400 dark:text-text-faint">
                    Vol: {formatVolume(q.volume)}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-text-faint">
                    VR: {q.volumeRatio.toFixed(1)}x
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-text-faint">
                    {formatMarketCap(q.marketCap)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-stone-900 dark:text-text">
                  ${q.price.toFixed(2)}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    q.changePct >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-600 dark:text-loss"
                  }`}
                >
                  {q.changePct >= 0 ? "+" : ""}
                  {q.changePct.toFixed(2)}%
                </p>
              </div>
            </Link>
          ))}

          {sortedQuotes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-stone-500 dark:text-text-subtle">Could not fetch quotes for this sector.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
