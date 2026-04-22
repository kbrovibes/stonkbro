import { NewsItem } from "@/lib/mock/stocks";

export default function NewsCard({ item }: { item: NewsItem }) {
  const sentimentColors = {
    bullish: "text-emerald-600 bg-emerald-50",
    bearish: "text-red-600 bg-red-50",
    neutral: "text-stone-500 bg-stone-100",
  };

  return (
    <div className="p-3 rounded-xl border border-stone-200 bg-white">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-stone-900 leading-snug">{item.title}</h4>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${sentimentColors[item.sentiment]}`}>
          {item.sentiment}
        </span>
      </div>
      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{item.summary}</p>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-400">
        <span>{item.source}</span>
        <span>·</span>
        <span>{item.time}</span>
      </div>
    </div>
  );
}
