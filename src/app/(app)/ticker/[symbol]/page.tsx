import Link from "next/link";
import { getQuote } from "@/lib/market/yahoo";
import StockChart from "@/components/StockChart";
import TickerCSPSection from "@/components/TickerCSPSection";

type Params = Promise<{ symbol: string }>;

export const dynamic = "force-dynamic";

function Indicator({ label, value, status }: { label: string; value: string; status: "green" | "red" | "neutral" }) {
  const colors = {
    green: "text-emerald-700 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    neutral: "text-stone-600 bg-stone-100",
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
      <span className="text-xs text-stone-500">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status]}`}>{value}</span>
    </div>
  );
}

export default async function TickerPage({ params }: { params: Params }) {
  const { symbol } = await params;
  const quote = await getQuote(symbol.toUpperCase());

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-4">
        <p className="text-stone-500">Could not load data for {symbol}</p>
        <Link href="/" className="text-sm text-sky-600 hover:underline">Back to Discovery</Link>
      </div>
    );
  }

  const signals: string[] = [];
  if (quote.above50sma && quote.above200sma) signals.push("Above all MAs");
  else if (quote.above50sma) signals.push("Above 50 SMA");
  if (quote.volumeRatio >= 2) signals.push(`Volume ${quote.volumeRatio.toFixed(1)}x avg`);
  if (quote.changePct > 3) signals.push("Strong momentum");
  if (quote.price > quote.fiftyTwoWeekHigh * 0.95) signals.push("Near 52w high");
  if (quote.price < quote.fiftyTwoWeekLow * 1.1) signals.push("Near 52w low");
  if (quote.earningsDate) {
    const daysToEarnings = Math.ceil((new Date(quote.earningsDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToEarnings >= 0 && daysToEarnings <= 14) signals.push(`Earnings in ${daysToEarnings}d`);
  }

  const pctFrom52High = ((quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh * 100).toFixed(1);
  const pctFrom52Low = ((quote.price - quote.fiftyTwoWeekLow) / quote.fiftyTwoWeekLow * 100).toFixed(1);

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
      <div className="flex-1">
        <h2 className="text-xl font-extrabold text-stone-900">{quote.symbol}</h2>
        <p className="text-sm text-stone-500">{quote.name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-lg font-bold text-stone-900">${quote.price.toFixed(2)}</span>
          <span className={`text-sm font-semibold ${quote.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%
          </span>
          <span className="text-xs text-stone-400">
            ({quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)})
          </span>
        </div>
        {quote.lastTradeDate && (
          <p className="text-[11px] text-stone-400 mt-1">
            As of {new Date(quote.lastTradeDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET
            {" · "}May be 15min delayed
          </p>
        )}
      </div>

      {/* Chart */}
      <StockChart symbol={quote.symbol} currentPrice={quote.price} />

      {/* Signals */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {signals.map((signal) => (
            <span key={signal} className="text-xs font-medium bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-200">
              {signal}
            </span>
          ))}
        </div>
      )}

      {/* Key Stats */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-900 mb-2">Key Stats</h3>
        <Indicator label="50-Day SMA" value={`$${quote.fiftyDayAvg.toFixed(2)}`} status={quote.above50sma ? "green" : "red"} />
        <Indicator label="200-Day SMA" value={`$${quote.twoHundredDayAvg.toFixed(2)}`} status={quote.above200sma ? "green" : "red"} />
        <Indicator label="Volume vs Avg" value={`${quote.volumeRatio.toFixed(1)}x`} status={quote.volumeRatio >= 1.5 ? "green" : "neutral"} />
        <Indicator label="52w High" value={`$${quote.fiftyTwoWeekHigh.toFixed(2)} (-${pctFrom52High}%)`} status="neutral" />
        <Indicator label="52w Low" value={`$${quote.fiftyTwoWeekLow.toFixed(2)} (+${pctFrom52Low}%)`} status="neutral" />
        <Indicator label="Market Cap" value={quote.marketCap >= 1e12 ? `$${(quote.marketCap / 1e12).toFixed(1)}T` : quote.marketCap >= 1e9 ? `$${(quote.marketCap / 1e9).toFixed(1)}B` : `$${(quote.marketCap / 1e6).toFixed(0)}M`} status="neutral" />
        {quote.earningsDate && (
          <Indicator label="Earnings Date" value={quote.earningsDate} status="neutral" />
        )}
      </div>

      {/* Volume bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-500">Volume</span>
          <span className="text-xs text-stone-500">{(quote.volume / 1e6).toFixed(1)}M / {(quote.avgVolume / 1e6).toFixed(1)}M avg</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${quote.volumeRatio >= 2 ? "bg-amber-500" : "bg-stone-300"}`}
            style={{ width: `${Math.min(quote.volumeRatio / 4 * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* CSP Recommendations */}
      <TickerCSPSection symbol={quote.symbol} />

      {/* Options CTAs */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/suggestions/${quote.symbol}`}
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
          href={`/ticker/${quote.symbol}/pmcc`}
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
    </div>
  );
}
