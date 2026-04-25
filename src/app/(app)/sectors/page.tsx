import Link from "next/link";
import { SECTORS } from "@/lib/market/sectors";

const colorMap: Record<string, { bg: string; border: string; text: string; tag: string }> = {
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", tag: "bg-violet-100 text-violet-700" },
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", tag: "bg-sky-100 text-sky-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", tag: "bg-indigo-100 text-indigo-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", tag: "bg-emerald-100 text-emerald-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", tag: "bg-amber-100 text-amber-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", tag: "bg-rose-100 text-rose-700" },
  lime: { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-700", tag: "bg-lime-100 text-lime-700" },
};

export default function SectorsPage() {
  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div>
        <h2 className="text-lg font-extrabold text-stone-900">Sector Discovery</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Find explosive stocks by sector theme
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SECTORS.map((sector) => {
          const colors = colorMap[sector.color] ?? colorMap.violet;
          return (
            <Link
              key={sector.slug}
              href={`/sectors/${sector.slug}`}
              className={`rounded-xl border ${colors.border} ${colors.bg} p-4 hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h3 className={`text-sm font-bold ${colors.text}`}>
                  {sector.name}
                </h3>
                <span className="text-[10px] font-semibold text-stone-400 bg-white/60 px-2 py-0.5 rounded-full">
                  {sector.tickers.length} tickers
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed mb-3">
                {sector.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sector.catalysts.slice(0, 3).map((catalyst) => (
                  <span
                    key={catalyst}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.tag}`}
                  >
                    {catalyst}
                  </span>
                ))}
                {sector.catalysts.length > 3 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    +{sector.catalysts.length - 3} more
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
