import { NextResponse } from "next/server";
import { getHistory } from "@/lib/market/history";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CACHE_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols" }, { status: 400 });
  }

  const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).slice(0, 50); // increased cap to 50
  const result: Record<string, number[]> = {};

  try {
    // 1. Try to fetch from cache first
    const { data: cachedData } = await supabaseAdmin
      .from("market_sparklines")
      .select("symbol, data, updated_at")
      .in("symbol", symbols);

    const cacheMap = new Map(cachedData?.map(d => [d.symbol, d]) || []);
    const now = new Date().getTime();
    const symbolsToFetch: string[] = [];

    for (const symbol of symbols) {
      const cached = cacheMap.get(symbol);
      if (cached && (now - new Date(cached.updated_at).getTime() < CACHE_STALE_MS)) {
        result[symbol] = cached.data;
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    // 2. Fetch missing or stale symbols
    if (symbolsToFetch.length > 0) {
      // Process in small batches to avoid timeout
      for (let i = 0; i < symbolsToFetch.length; i += 5) {
        const batch = symbolsToFetch.slice(i, i + 5);
        await Promise.all(batch.map(async (symbol) => {
          try {
            const bars = await getHistory(symbol, 5);
            const prices = bars.map((b) => b.close);
            result[symbol] = prices;

            // Update cache in background (no await)
            if (prices.length > 0) {
              supabaseAdmin
                .from("market_sparklines")
                .upsert({
                  symbol,
                  data: prices,
                  updated_at: new Date().toISOString()
                })
                .then(({ error }) => {
                  if (error) console.error(`Cache update failed for ${symbol}:`, error);
                });
            }
          } catch {
            result[symbol] = [];
          }
        }));
      }
    }

    return NextResponse.json({ sparklines: result, cachedCount: cachedData?.length || 0, fetchedCount: symbolsToFetch.length });
  } catch (err) {
    console.error("Sparklines API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
