import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/yahoo";
import { scoreStocks } from "@/lib/scoring";

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
    const scored = scoreStocks(quotes);

    return NextResponse.json({ quotes: scored });
  } catch (e) {
    console.error("Scanner error:", e);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
