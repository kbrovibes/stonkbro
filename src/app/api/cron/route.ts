import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/yahoo";
import { generateAlerts, TrackedPosition } from "@/lib/options/signals";
import { sendDailyBriefing, AlertItem } from "@/lib/notifications/email";
import { supabaseAdmin } from "@/lib/supabase";
import { scanForMovers } from "@/lib/analysis/movers";
import { sendPushToAll } from "@/lib/notifications/push";
import { runPortfolioManagerScan } from "@/lib/portfolio-manager/runner";

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

    // Group positions by user
    const positionsByUser = new Map<string, NonNullable<typeof allPositions>>();
    if (allPositions) {
      for (const pos of allPositions) {
        const userId = pos.user_id;
        if (!positionsByUser.has(userId)) positionsByUser.set(userId, []);
        positionsByUser.get(userId)!.push(pos);
      }
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

    // Collect alerts per user, then combine with movers before sending
    const allAlertsByUser = new Map<string, { email: string; alerts: AlertItem[] }>();

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

      allAlertsByUser.set(userId, { email, alerts });
    }

    // Scan for explosive movers across the full universe
    let moverAlerts: AlertItem[] = [];
    let moversScanned = 0;
    try {
      const { movers, scannedCount } = await scanForMovers();
      moversScanned = scannedCount;
      moverAlerts = movers.map((mover) => ({
        action: "BUY" as const,
        symbol: mover.symbol,
        strategy: mover.suggestedPlay,
        message: `${mover.symbol} ${mover.direction === "up" ? "+" : ""}${mover.changePct.toFixed(1)}% on ${mover.volumeRatio.toFixed(1)}x volume — ${mover.reasoning}`,
        urgency: "medium" as const,
        details: `$${mover.price.toFixed(2)} · Suggested: ${mover.suggestedPlay}`,
      }));
    } catch (err) {
      console.error("Movers scan failed:", err);
    }

    // Ensure all users with emails are included, even those without positions
    if (settings) {
      for (const s of settings) {
        if (s.alert_email && !allAlertsByUser.has(s.user_id)) {
          allAlertsByUser.set(s.user_id, { email: s.alert_email, alerts: [] });
        }
      }
    }
    // Also ensure fallback email gets movers if no user-specific settings exist
    if (fallbackEmail && allAlertsByUser.size === 0) {
      allAlertsByUser.set("fallback", { email: fallbackEmail, alerts: [] });
    }

    // Send emails: combine position alerts with mover alerts per user
    for (const [userId, { email, alerts }] of allAlertsByUser) {
      const combined = [...alerts, ...moverAlerts];

      if (combined.length > 0 || new Date().getHours() === 13) {
        // Always send morning briefing (9:30am ET = 13:30 UTC), otherwise only if alerts
        await sendDailyBriefing(email, combined);
      }

      results.push({ userId, email, alertCount: combined.length });
    }

    // Push notification for alerts
    const totalAlerts = results.reduce((n, r) => n + r.alertCount, 0);
    let push = { sent: 0, failed: 0 };
    if (totalAlerts > 0) {
      push = await sendPushToAll({
        title: `stonkbro: ${totalAlerts} alert${totalAlerts > 1 ? "s" : ""}`,
        body: moverAlerts.length > 0
          ? `${moverAlerts.length} movers + ${totalAlerts - moverAlerts.length} position alerts`
          : `${totalAlerts} position alert${totalAlerts > 1 ? "s" : ""}`,
        url: "/today",
        tag: "daily-alerts",
      });
    }

    // Fire-and-forget portfolio manager scan (ride-along at market close)
    runPortfolioManagerScan({ scan_type: "scheduled", trigger_source: "cron-close" })
      .then((r) => console.log(`[portfolio-manager] ride-along complete: ${r.status} (${r.ticker_count} tickers, ${r.duration_ms}ms)`))
      .catch((e) => console.error("[portfolio-manager] ride-along failed:", e));

    return NextResponse.json({
      success: true,
      usersProcessed: results.length,
      moversFound: moverAlerts.length,
      moversScanned,
      push,
      results,
    });
  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json({ error: "Cron job failed", details: String(e) }, { status: 500 });
  }
}
