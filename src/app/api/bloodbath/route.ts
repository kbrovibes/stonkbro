import { NextResponse } from "next/server";
import { scanBloodbath } from "@/lib/analysis/bloodbath";
import { createClient } from "@/lib/supabase-server";
import { getAllWatchlistSymbols } from "@/lib/db/watchlists";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
      // watchlist unavailable — continue with the scan universe only
    }

    const scan = await scanBloodbath(watchlistSymbols);

    return NextResponse.json({
      ...scan,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Bloodbath scan error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
