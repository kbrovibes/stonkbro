import { NextResponse } from "next/server";
import { getHistory } from "@/lib/market/history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const days = parseInt(searchParams.get("days") || "22", 10);

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const bars = await getHistory(symbol.toUpperCase(), Math.min(days, 365));
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      bars: bars.map((b) => ({ date: b.date, close: b.close })),
    });
  } catch (e) {
    console.error("History API error:", e);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
