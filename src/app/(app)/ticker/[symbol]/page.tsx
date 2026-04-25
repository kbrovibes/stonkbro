import Link from "next/link";
import { mockStocks, mockNews } from "@/lib/mock/stocks";
import ScoreBadge from "@/components/ScoreBadge";
import Sparkline from "@/components/Sparkline";
import TechnicalIndicators from "@/components/TechnicalIndicators";
import NewsCard from "@/components/NewsCard";

type Params = Promise<{ symbol: string }>;

export default async function TickerPage({ params }: { params: Params }) {
  const { symbol } = await params;
  const stock = mockStocks.find((s) => s.symbol === symbol);
  const news = mockNews[symbol] || [];

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        <p className="text-stone-500">Ticker not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      {/* Back */}
      <Link href="/" className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Discovery
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <ScoreBadge score={stock.score} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-stone-900">{stock.symbol}</h2>
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {stock.sector}
            </span>
          </div>
          <p className="text-sm text-stone-500">{stock.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold text-stone-900">${stock.price.toFixed(2)}</span>
            <span className={`text-sm font-semibold ${stock.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="h-24">
          <Sparkline
            data={stock.sparkline}
            color={stock.changePct >= 0 ? "#059669" : "#ef4444"}
          />
        </div>
      </div>

      {/* Signals */}
      <div className="flex flex-wrap gap-2">
        {stock.signals.map((signal) => (
          <span key={signal} className="text-xs font-medium bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-200">
            {signal}
          </span>
        ))}
      </div>

      {/* Technicals */}
      <TechnicalIndicators stock={stock} />

      {/* Options CTAs */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/suggestions/${stock.symbol}`}
          className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-900">Options Suggestions</h3>
            <p className="text-xs text-stone-500 mt-0.5">CSP, Covered Call, and PMCC recommendations</p>
          </div>
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link
          href={`/ticker/${stock.symbol}/pmcc`}
          className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-900">PMCC Analyzer</h3>
            <p className="text-xs text-stone-500 mt-0.5">View LEAPS + short call setups</p>
          </div>
          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* News */}
      {news.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-stone-900 mb-3">Latest News</h3>
          <div className="flex flex-col gap-2">
            {news.map((item, i) => (
              <NewsCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
