import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/yahoo";
import { generateAlerts, TrackedPosition } from "@/lib/options/signals";
import { sendDailyBriefing } from "@/lib/notifications/email";
import { supabaseAdmin } from "@/lib/supabase";

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
    // Get all users with alert_email configured
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("user_id, alert_email")
      .not("alert_email", "is", null);

    // Also check ALERT_EMAIL env var as fallback
    const fallbackEmail = process.env.ALERT_EMAIL;
    const results: { userId: string; email: string; alertCount: number }[] = [];

    // Get all users who have active positions
    const { data: allPositions } = await supabaseAdmin
      .from("positions")
      .select("*, position_legs(*)")
      .eq("status", "active");

    if (!allPositions || allPositions.length === 0) {
      return NextResponse.json({ success: true, message: "No active positions across any users" });
    }

    // Group positions by user
    const positionsByUser = new Map<string, typeof allPositions>();
    for (const pos of allPositions) {
      const userId = pos.user_id;
      if (!positionsByUser.has(userId)) positionsByUser.set(userId, []);
      positionsByUser.get(userId)!.push(pos);
    }

    // Get all watchlist symbols across all users
    const { data: allWatchlistItems } = await supabaseAdmin
      .from("watchlist_items")
      .select("symbol, watchlist_id, watchlists!inner(user_id)")
      .limit(200);

    const watchlistByUser = new Map<string, string[]>();
    if (allWatchlistItems) {
      for (const item of allWatchlistItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (item.watchlists as any)?.user_id;
        if (userId) {
          if (!watchlistByUser.has(userId)) watchlistByUser.set(userId, []);
          watchlistByUser.get(userId)!.push(item.symbol);
        }
      }
    }

    // Process each user
    for (const [userId, userPositions] of positionsByUser) {
      // Find email for this user
      const userSetting = settings?.find((s) => s.user_id === userId);
      const email = userSetting?.alert_email || fallbackEmail;
      if (!email) continue;

      // Convert positions to TrackedPosition format
      const tracked: TrackedPosition[] = userPositions.map((p) => ({
        symbol: p.symbol,
        strategy: p.strategy as TrackedPosition["strategy"],
        legs: (p.position_legs || []).map((leg: { type: string; strike: number; expiry: string; entry_price: number }) => ({
          type: leg.type,
          strike: Number(leg.strike),
          expiry: leg.expiry,
          entryPrice: Number(leg.entry_price),
        })),
        entryDate: p.entry_date,
      }));

      // Get unique symbols from positions + watchlist
      const posSymbols = [...new Set(tracked.map((t) => t.symbol))];
      const watchSymbols = watchlistByUser.get(userId) || [];
      const allSymbols = [...new Set([...posSymbols, ...watchSymbols])];

      // Fetch live quotes
      const quotes = await getQuotes(allSymbols);
      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

      // Generate alerts
      const alerts = generateAlerts(tracked, quoteMap);

      // Send email
      if (alerts.length > 0 || new Date().getHours() === 13) {
        // Always send morning briefing (9:30am ET = 13:30 UTC), otherwise only if alerts
        await sendDailyBriefing(email, alerts);
      }

      results.push({ userId, email, alertCount: alerts.length });
    }

    return NextResponse.json({
      success: true,
      usersProcessed: results.length,
      results,
    });
  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json({ error: "Cron job failed", details: String(e) }, { status: 500 });
  }
}
