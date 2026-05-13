import { NextResponse } from "next/server";
import { getHistory } from "@/lib/market/history";
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
    // Collect all watchlist symbols + scan universe
    const { data: watchlistItems } = await supabaseAdmin
      .from("watchlist_items")
      .select("symbol")
      .limit(500);

    const watchlistSymbols = [...new Set((watchlistItems ?? []).map((i: { symbol: string }) => i.symbol.toUpperCase()))];
    const allSymbols = [...new Set([...SCAN_UNIVERSE, ...watchlistSymbols])];

    // Batch in groups of 10 to avoid rate limits
    const BATCH = 10;
    let updated = 0;
    for (let i = 0; i < allSymbols.length; i += BATCH) {
      const batch = allSymbols.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const history = await getHistory(symbol, 5);
            if (!history?.length) return;
            const prices = history.map((h: { close: number }) => h.close);
            await supabaseAdmin.from("market_sparklines").upsert({
              symbol,
              data: prices,
              updated_at: new Date().toISOString(),
            });
            updated++;
          } catch {
            // skip failures silently
          }
        })
      );
    }

    return NextResponse.json({ success: true, updated, total: allSymbols.length });
  } catch (e) {
    console.error("Sparklines cron error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
