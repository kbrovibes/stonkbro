import { NextResponse } from "next/server";
import { getQuotes, getAllOptionsChains } from "@/lib/market/yahoo";
import { analyzeFlow, type FlowSummary } from "@/lib/options/flow-scanner";

export const dynamic = "force-dynamic";

// Default tickers to scan — high-options-volume names
const DEFAULT_UNIVERSE = [
  "NVDA", "AAPL", "MSFT", "TSLA", "AMD",
  "PLTR", "META", "AMZN", "GOOGL", "NFLX",
  "SOFI", "COIN", "RKLB", "SMCI", "AVGO",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");
  const tickers = tickersParam
    ? tickersParam.split(",").map((t) => t.trim().toUpperCase())
    : DEFAULT_UNIVERSE;

  try {
    // Fetch quotes for all tickers
    const quotes = await getQuotes(tickers);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Analyze each ticker sequentially (rate limit friendly)
    const results: FlowSummary[] = [];
    for (const symbol of tickers) {
      const quote = quoteMap.get(symbol);
      if (!quote) continue;

      const chain = await getAllOptionsChains(symbol);
      if (!chain) continue;

      const summary = analyzeFlow(symbol, quote, chain);
      // Only include tickers with actual signals
      if (summary.signals.length > 0 || summary.activityScore > 0) {
        results.push(summary);
      }
    }

    // Sort by activity score
    results.sort((a, b) => b.activityScore - a.activityScore);

    return NextResponse.json({
      flow: results,
      tickersScanned: tickers.length,
      tickersWithActivity: results.length,
    });
  } catch (e) {
    console.error("Flow scanner error:", e);
    return NextResponse.json({ error: "Failed to scan options flow" }, { status: 500 });
  }
}
