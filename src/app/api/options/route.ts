import { NextResponse } from "next/server";
import { getQuote, getAllOptionsChains } from "@/lib/market/yahoo";
import { findPMCCSetups } from "@/lib/options/pmcc";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const [quote, chain] = await Promise.all([
      getQuote(symbol),
      getAllOptionsChains(symbol),
    ]);

    if (!quote) {
      return NextResponse.json({ error: `Quote not found for ${symbol}` }, { status: 404 });
    }

    if (!chain) {
      return NextResponse.json({ error: `Options chain not found for ${symbol}` }, { status: 404 });
    }

    const pmccSetups = findPMCCSetups(symbol, quote.price, chain.calls);

    return NextResponse.json({
      quote,
      expirations: chain.expirations,
      pmccSetups: pmccSetups.slice(0, 6), // top 6 setups
      callCount: chain.calls.length,
      putCount: chain.puts.length,
    });
  } catch (e) {
    console.error("Options error:", e);
    return NextResponse.json({ error: "Failed to fetch options data" }, { status: 500 });
  }
}
