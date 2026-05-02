import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { getQuotes } from "@/lib/market/yahoo";
import { generateAlerts, TrackedPosition } from "@/lib/options/signals";
import { sendDailyBriefing, AlertItem } from "@/lib/notifications/email";
import { scanForMovers } from "@/lib/analysis/movers";
import { sendPushToAll } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's alert email
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("alert_email")
    .eq("user_id", user.id)
    .single();

  const email = settings?.alert_email;
  if (!email) {
    return NextResponse.json(
      { error: "No alert email configured. Save one in Settings first." },
      { status: 400 }
    );
  }

  try {
    // Fetch user's active positions
    const { data: positions } = await supabaseAdmin
      .from("positions")
      .select("*, position_legs(*)")
      .eq("user_id", user.id)
      .eq("status", "active");

    const tracked: TrackedPosition[] = (positions || []).map((p) => ({
      symbol: p.symbol,
      strategy: p.strategy as TrackedPosition["strategy"],
      legs: (p.position_legs || []).map(
        (leg: {
          type: string;
          strike: number;
          expiry: string;
          entry_price: number;
        }) => ({
          type: leg.type,
          strike: Number(leg.strike),
          expiry: leg.expiry,
          entryPrice: Number(leg.entry_price),
        })
      ),
      entryDate: p.entry_date,
    }));

    // Fetch user's watchlist symbols
    const { data: watchlistItems } = await supabaseAdmin
      .from("watchlist_items")
      .select("symbol, watchlist_id, watchlists!inner(user_id)")
      .eq("watchlists.user_id", user.id)
      .limit(100);

    const watchSymbols = (watchlistItems || []).map((item) => item.symbol);
    const posSymbols = [...new Set(tracked.map((t) => t.symbol))];
    const allSymbols = [...new Set([...posSymbols, ...watchSymbols])];

    // Get quotes + generate position alerts
    let alerts: AlertItem[] = [];
    if (allSymbols.length > 0) {
      const quotes = await getQuotes(allSymbols);
      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
      alerts = generateAlerts(tracked, quoteMap);
    }

    // Scan for movers
    let moverAlerts: AlertItem[] = [];
    try {
      const { movers } = await scanForMovers();
      moverAlerts = movers.map((mover) => ({
        action: "BUY" as const,
        symbol: mover.symbol,
        strategy: mover.suggestedPlay,
        message: `${mover.symbol} ${mover.direction === "up" ? "+" : ""}${mover.changePct.toFixed(1)}% on ${mover.volumeRatio.toFixed(1)}x volume — ${mover.reasoning}`,
        urgency: "medium" as const,
        details: `$${mover.price.toFixed(2)} · Suggested: ${mover.suggestedPlay}`,
      }));
    } catch {
      // Movers scan is best-effort
    }

    const combined = [...alerts, ...moverAlerts];
    await sendDailyBriefing(email, combined);

    const push = await sendPushToAll({
      title: combined.length > 0
        ? `stonkbro: ${combined.length} alert${combined.length > 1 ? "s" : ""}`
        : "stonkbro: all clear today",
      body: combined.length > 0
        ? `${moverAlerts.length} movers + ${alerts.length} position alerts`
        : "No action items — your positions look good",
      url: "/today",
      tag: "test-digest",
    });

    return NextResponse.json({
      ok: true,
      email,
      alertCount: combined.length,
      push,
    });
  } catch (e) {
    console.error("Test email error:", e);
    return NextResponse.json(
      { error: "Failed to send test email", details: String(e) },
      { status: 500 }
    );
  }
}
