import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/yahoo";

// Default watchlist for PMCC candidates — high-beta, liquid options
const DEFAULT_TICKERS = [
  "NVDA", "AAPL", "MSFT", "TSLA", "AMD",
  "PLTR", "META", "AMZN", "GOOGL", "NFLX",
  "SOFI", "COIN", "RKLB", "SMCI", "CELH",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");
  const tickers = tickersParam ? tickersParam.split(",") : DEFAULT_TICKERS;

  try {
    const quotes = await getQuotes(tickers);

    // Sort by volume ratio (explosive potential proxy)
    const sorted = quotes.sort((a, b) => {
      // Simple scoring: volume ratio + momentum + MA position
      const scoreA = a.volumeRatio * 20 + (a.changePct > 0 ? 10 : 0) + (a.above50sma ? 15 : 0) + (a.above200sma ? 10 : 0);
      const scoreB = b.volumeRatio * 20 + (b.changePct > 0 ? 10 : 0) + (b.above50sma ? 15 : 0) + (b.above200sma ? 10 : 0);
      return scoreB - scoreA;
    });

    return NextResponse.json({ quotes: sorted });
  } catch (e) {
    console.error("Scanner error:", e);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
