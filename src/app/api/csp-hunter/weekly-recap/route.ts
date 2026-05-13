import { NextResponse } from "next/server";
import { getWeeklyScans, aggregateWeeklyPicks } from "@/lib/options/csp-delta";
import { tradierGetQuotes } from "@/lib/market/tradier";

export async function GET() {
  const scans = await getWeeklyScans();
  if (scans.length === 0) {
    return NextResponse.json({ picks: [], scanCount: 0, weekStart: null });
  }

  const picks = aggregateWeeklyPicks(scans);

  // Fetch current prices for all unique symbols
  const symbols = [...new Set(picks.map((p) => p.symbol))];
  const quotes = await tradierGetQuotes(symbols);
  const priceMap = new Map(quotes.map((q) => [q.symbol, q.price]));

  const enriched = picks.map((p) => {
    const currentPrice = priceMap.get(p.symbol) ?? null;
    const pricePct =
      currentPrice != null && p.pickPrice > 0
        ? Math.round(((currentPrice - p.pickPrice) / p.pickPrice) * 1000) / 10
        : null;
    const strikeBreached =
      p.type === "csp" && currentPrice != null ? currentPrice < p.strike : null;

    return { ...p, currentPrice, pricePct, strikeBreached };
  });

  const weekStart = scans[0].created_at;

  return NextResponse.json({ picks: enriched, scanCount: scans.length, weekStart });
}
