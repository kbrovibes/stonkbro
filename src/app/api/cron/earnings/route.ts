import { NextResponse } from "next/server";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { supabaseAdmin } from "@/lib/supabase";
import { SCAN_UNIVERSE } from "@/lib/analysis/movers";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Gather all watchlist symbols across all users
    const { data: watchlistItems } = await supabaseAdmin
      .from("watchlist_items")
      .select("symbol")
      .limit(500);

    const watchlistSymbols = [...new Set((watchlistItems ?? []).map((i: { symbol: string }) => i.symbol.toUpperCase()))];
    const allSymbols = [...new Set([...SCAN_UNIVERSE, ...watchlistSymbols])];

    const earnings = await getEarningsCalendar(allSymbols);

    await supabaseAdmin.from("market_cache").upsert({
      key: "earnings",
      data: earnings as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, count: earnings.length, symbols: allSymbols.length });
  } catch (e) {
    console.error("Earnings cron error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
