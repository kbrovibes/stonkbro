import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/yahoo";
import { generateAlerts, TrackedPosition } from "@/lib/options/signals";
import { sendDailyBriefing } from "@/lib/notifications/email";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // no secret configured = allow (dev mode)
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) {
    return NextResponse.json({ error: "ALERT_EMAIL not configured" }, { status: 500 });
  }

  try {
    // TODO: Load positions from Supabase once persistence is built.
    // For now, use mock positions to demonstrate the alert system.
    const mockPositions: TrackedPosition[] = [
      {
        symbol: "NVDA",
        strategy: "PMCC",
        legs: [
          { type: "leaps_call", strike: 800, expiry: "2027-01-15", entryPrice: 185.00 },
          { type: "short_call", strike: 1000, expiry: "2026-05-16", entryPrice: 9.20, currentPrice: 4.10 },
        ],
        entryDate: "2026-01-15",
      },
      {
        symbol: "PLTR",
        strategy: "PMCC",
        legs: [
          { type: "leaps_call", strike: 55, expiry: "2027-01-15", entryPrice: 22.50 },
          { type: "short_call", strike: 85, expiry: "2026-05-16", entryPrice: 2.80, currentPrice: 1.20 },
        ],
        entryDate: "2026-02-03",
      },
      {
        symbol: "AAPL",
        strategy: "Covered Call",
        legs: [
          { type: "shares", strike: 0, expiry: "2099-12-31", entryPrice: 178.00 },
          { type: "short_call", strike: 195, expiry: "2026-05-16", entryPrice: 3.40, currentPrice: 2.80 },
        ],
        entryDate: "2026-03-10",
      },
      {
        symbol: "AMD",
        strategy: "Cash-Secured Put",
        legs: [
          { type: "short_put", strike: 145, expiry: "2026-05-16", entryPrice: 4.20, currentPrice: 1.80 },
        ],
        entryDate: "2026-04-01",
      },
    ];

    // Get all unique symbols from positions + watchlist
    const positionSymbols = [...new Set(mockPositions.map((p) => p.symbol))];
    const watchlistSymbols = ["TSLA", "META", "MSFT", "SOFI", "COIN", "SMCI"];
    const allSymbols = [...new Set([...positionSymbols, ...watchlistSymbols])];

    // Fetch live quotes
    const quotes = await getQuotes(allSymbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Generate alerts
    const alerts = generateAlerts(mockPositions, quoteMap);

    // Send email
    await sendDailyBriefing(alertEmail, alerts);

    return NextResponse.json({
      success: true,
      alertCount: alerts.length,
      alerts: alerts.map((a) => ({
        action: a.action,
        symbol: a.symbol,
        urgency: a.urgency,
        message: a.message,
      })),
    });
  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json({ error: "Cron job failed", details: String(e) }, { status: 500 });
  }
}
