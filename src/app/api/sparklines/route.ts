import { NextResponse } from "next/server";
import { getHistory } from "@/lib/market/history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols" }, { status: 400 });
  }

  const symbols = symbolsParam.split(",").slice(0, 30); // cap at 30
  const result: Record<string, number[]> = {};

  // Fetch 5-day history per symbol, extract close prices
  for (const symbol of symbols) {
    try {
      const bars = await getHistory(symbol.trim(), 5);
      result[symbol.trim().toUpperCase()] = bars.map((b) => b.close);
    } catch {
      result[symbol.trim().toUpperCase()] = [];
    }
  }

  return NextResponse.json({ sparklines: result });
}
