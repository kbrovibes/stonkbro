import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHistory } from "@/lib/market/history";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Collect all unique symbols from watchlists and positions
    const { data: watchlistItems } = await supabaseAdmin
      .from("watchlist_items")
      .select("symbol");
    
    const { data: positions } = await supabaseAdmin
      .from("positions")
      .select("symbol")
      .eq("status", "active");

    const symbolSet = new Set<string>();
    watchlistItems?.forEach(i => symbolSet.add(i.symbol.toUpperCase()));
    positions?.forEach(p => symbolSet.add(p.symbol.toUpperCase()));

    const symbols = Array.from(symbolSet);
    const results: { symbol: string; status: string }[] = [];

    // 2. Fetch and cache history per symbol
    // We do this in batches of 5 to avoid overloading Tradier/Mock if the list is long
    for (let i = 0; i < symbols.length; i += 5) {
      const batch = symbols.slice(i, i + 5);
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const bars = await getHistory(symbol, 5);
            const closePrices = bars.map(b => b.close);

            if (closePrices.length > 0) {
              const { error } = await supabaseAdmin
                .from("market_sparklines")
                .upsert({
                  symbol,
                  data: closePrices,
                  updated_at: new Date().toISOString(),
                });

              results.push({ symbol, status: error ? "error" : "success" });
            } else {
              results.push({ symbol, status: "no_data" });
            }
          } catch (err) {
            console.error(`Failed to refresh sparkline for ${symbol}:`, err);
            results.push({ symbol, status: "failed" });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      processed: symbols.length,
      results,
    });
  } catch (e) {
    console.error("Sparkline cron error:", e);
    return NextResponse.json({ error: "Cron job failed", details: String(e) }, { status: 500 });
  }
}
