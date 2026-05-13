import { NextRequest, NextResponse } from "next/server";
import { getEarningsCalendar, EarningsEvent } from "@/lib/market/earnings";
import { supabaseAdmin } from "@/lib/supabase";
import { SCAN_UNIVERSE } from "@/lib/analysis/movers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const symbolsParam = req.nextUrl.searchParams.get("symbols");
    const requestedSymbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : null;

    // Try cache first (populated nightly by /api/cron/earnings)
    const { data: cached } = await supabaseAdmin
      .from("market_cache")
      .select("data, updated_at")
      .eq("key", "earnings")
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 26 * 60 * 60 * 1000) { // accept up to 26h old
        const all = cached.data as EarningsEvent[];
        const earnings = requestedSymbols
          ? all.filter((e) => requestedSymbols.includes(e.symbol))
          : all;
        return NextResponse.json({ earnings, total: earnings.length, cached: true });
      }
    }

    // Cache miss — fetch live
    const symbols = requestedSymbols ?? SCAN_UNIVERSE;
    const earnings = await getEarningsCalendar(symbols);
    return NextResponse.json({ earnings, total: earnings.length });
  } catch (e) {
    console.error("Earnings API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch earnings calendar", earnings: [], total: 0 },
      { status: 500 }
    );
  }
}
