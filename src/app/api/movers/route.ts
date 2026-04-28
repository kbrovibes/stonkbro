import { NextResponse } from "next/server";
import { scanForMovers } from "@/lib/analysis/movers";
import { createClient } from "@/lib/supabase-server";
import { getAllWatchlistSymbols } from "@/lib/db/watchlists";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
      // watchlist unavailable — continue without it
    }

    const { movers, scannedCount } = await scanForMovers(watchlistSymbols);

    return NextResponse.json({
      movers,
      scannedCount,
      watchlistAdded: watchlistSymbols.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Movers scan error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
