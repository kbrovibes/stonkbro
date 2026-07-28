import { NextResponse } from "next/server";
import { scanBloodbath } from "@/lib/analysis/bloodbath";
import { getLatestScan } from "@/lib/db/bloodbath-scans";
import { createClient } from "@/lib/supabase-server";
import { getAllWatchlistSymbols } from "@/lib/db/watchlists";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Serve the cron-cached scan up to this age; covers weekends (Friday close → Monday open).
const MAX_CACHE_AGE_HOURS = 72;

export async function GET(request: Request) {
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    if (!forceRefresh) {
      try {
        const cached = await getLatestScan(MAX_CACHE_AGE_HOURS);
        if (cached) {
          return NextResponse.json({
            watchlist: cached.watchlist,
            market: cached.market,
            benchmarks: cached.benchmarks ?? [],
            scannedCount: cached.scanned_count,
            verdicts: cached.verdicts,
            cached: true,
            timestamp: cached.created_at,
          });
        }
      } catch (e) {
        console.error("Bloodbath cache read failed, falling back to live scan:", e);
      }
    }

    let watchlistSymbols: string[] = [];
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        watchlistSymbols = await getAllWatchlistSymbols(user.id);
      }
    } catch {
      // watchlist unavailable — continue with the scan universe only
    }

    const scan = await scanBloodbath(watchlistSymbols);

    return NextResponse.json({
      ...scan,
      verdicts: null,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Bloodbath scan error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
