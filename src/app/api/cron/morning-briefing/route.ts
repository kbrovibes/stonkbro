import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getQuotes } from "@/lib/market/yahoo";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { generateAlerts, type TrackedPosition } from "@/lib/options/signals";
import { analyzeRollOpportunities, rollRecommendationsToAlerts } from "@/lib/options/roll-advisor";
import { scanForMovers } from "@/lib/analysis/movers";
import {
  sendMorningBriefing,
  type MoverDigest,
  type EarningsDigest,
  type ExpiringPosition,
  type RecommendationDigest,
  type MorningBriefingData,
} from "@/lib/notifications/morning-briefing";
import { sendPushToAll } from "@/lib/notifications/push";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

const EARNINGS_TICKERS = [
  "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX",
  "AMD", "AVGO", "PLTR", "CRWD", "COIN", "SHOP", "JPM", "GS",
  "COST", "DIS", "BA", "UBER", "SOFI", "RKLB",
];

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all users with alert emails
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("user_id, alert_email")
      .not("alert_email", "is", null);

    const fallbackEmail = process.env.ALERT_EMAIL;
    const emailTargets: { userId: string; email: string }[] = [];

    if (settings) {
      for (const s of settings) {
        if (s.alert_email) emailTargets.push({ userId: s.user_id, email: s.alert_email });
      }
    }
    if (emailTargets.length === 0 && fallbackEmail) {
      emailTargets.push({ userId: "fallback", email: fallbackEmail });
    }
    if (emailTargets.length === 0) {
      return NextResponse.json({ message: "No email recipients configured" });
    }

    // 2. Gather data in parallel
    const [moversResult, earningsResult] = await Promise.allSettled([
      scanForMovers(),
      getEarningsCalendar(EARNINGS_TICKERS),
    ]);

    // Movers
    const movers: MoverDigest[] = [];
    if (moversResult.status === "fulfilled") {
      for (const m of moversResult.value.movers) {
        movers.push({
          symbol: m.symbol,
          price: m.price,
          changePct: m.changePct,
          volumeRatio: m.volumeRatio,
          direction: m.direction,
        });
      }
    }

    // Earnings today/tomorrow
    const todayEarnings: EarningsDigest[] = [];
    if (earningsResult.status === "fulfilled") {
      for (const e of earningsResult.value) {
        if (e.daysUntil <= 1) {
          todayEarnings.push({
            symbol: e.symbol,
            name: e.name,
            earningsDate: e.earningsDate,
            timing: e.timing,
            daysUntil: e.daysUntil,
          });
        }
      }
    }

    // 3. Process per user
    const results: { userId: string; email: string; sent: boolean }[] = [];

    for (const target of emailTargets) {
      // Get user's active positions
      const { data: positions } = await supabaseAdmin
        .from("positions")
        .select("*, position_legs(*)")
        .eq("user_id", target.userId)
        .eq("status", "active");

      const tracked: TrackedPosition[] = (positions || []).map((p) => ({
        symbol: p.symbol,
        strategy: p.strategy as TrackedPosition["strategy"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        legs: (p.position_legs || []).map((leg: any) => ({
          type: leg.type,
          strike: Number(leg.strike),
          expiry: leg.expiry,
          entryPrice: Number(leg.entry_price),
        })),
        entryDate: p.entry_date,
        trailing_stop_pct: p.trailing_stop_pct,
        peak_price: p.peak_price,
        entry_price_per_share: p.entry_price_per_share,
      }));

      // Fetch quotes for position symbols
      const posSymbols = [...new Set(tracked.map((t) => t.symbol))];
      const quotes = posSymbols.length > 0 ? await getQuotes(posSymbols) : [];
      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

      // Generate alerts + smart roll
      const basicAlerts = tracked.length > 0 ? generateAlerts(tracked, quoteMap) : [];
      const rollRecs = tracked.length > 0 ? analyzeRollOpportunities(tracked, quoteMap) : [];
      const rollAlerts = rollRecommendationsToAlerts(rollRecs);
      const allAlerts = [...basicAlerts, ...rollAlerts];

      // Find expiring positions (DTE <= 7)
      const now = new Date();
      const expiring: ExpiringPosition[] = [];
      for (const pos of tracked) {
        for (const leg of pos.legs) {
          if (leg.type === "short_call" || leg.type === "short_put") {
            const dte = Math.ceil((new Date(leg.expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (dte >= 0 && dte <= 7) {
              expiring.push({
                symbol: pos.symbol,
                strategy: pos.strategy,
                legType: leg.type,
                strike: leg.strike,
                expiry: leg.expiry,
                dte,
              });
            }
          }
        }
      }

      // Get latest recommendations
      const recommendations: RecommendationDigest[] = [];
      try {
        const { data: recs } = await supabaseAdmin
          .from("daily_recommendations")
          .select("result")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recs?.result) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed = typeof recs.result === "string" ? JSON.parse(recs.result) : recs.result;
          if (Array.isArray(parsed)) {
            for (const pick of parsed.slice(0, 5)) {
              if (pick.symbol && pick.action) {
                recommendations.push({
                  symbol: pick.symbol,
                  action: pick.action,
                  rationale: pick.rationale || "",
                });
              }
            }
          }
        }
      } catch {
        // Recommendations table might not exist yet — skip
      }

      const briefingData: MorningBriefingData = {
        movers,
        earnings: todayEarnings,
        expiring,
        alerts: allAlerts,
        recommendations,
        date: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      };

      await sendMorningBriefing(target.email, briefingData);
      results.push({ userId: target.userId, email: target.email, sent: true });
    }

    // Send push notification summary
    const urgentCount = results.reduce((n, r) => n, 0);
    const pushParts: string[] = [];
    if (movers.length > 0) pushParts.push(`${movers.length} movers`);
    if (todayEarnings.length > 0) pushParts.push(`${todayEarnings.length} earnings`);
    const pushBody = pushParts.length > 0
      ? pushParts.join(", ") + " — check your briefing"
      : "Morning briefing ready";

    const push = await sendPushToAll({
      title: "stonkbro morning briefing",
      body: pushBody,
      url: "/today",
      tag: "morning-briefing",
    });

    return NextResponse.json({
      success: true,
      recipients: results.length,
      movers: movers.length,
      earnings: todayEarnings.length,
      push,
      results,
    });
  } catch (e) {
    console.error("Morning briefing cron error:", e);
    return NextResponse.json({ error: "Morning briefing failed", details: String(e) }, { status: 500 });
  }
}
