import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getQuotes } from "@/lib/market/yahoo";
import { generateAlerts, TrackedPosition } from "@/lib/options/signals";
import { analyzeRollOpportunities, rollRecommendationsToAlerts } from "@/lib/options/roll-advisor";
import { calculateHealth, type PositionHealth } from "@/lib/options/health-score";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const positions: any[] = await getPositions(user.id);
    const activePositions = positions.filter((p: { status: string }) => p.status === "active");

    if (activePositions.length === 0) {
      return NextResponse.json({ alerts: [], message: "No active positions" });
    }

    // Convert Supabase positions to TrackedPosition format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracked: TrackedPosition[] = activePositions.map((p: any) => ({
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
    }));

    // Get unique symbols and fetch live quotes
    const symbols = [...new Set(tracked.map((t) => t.symbol))];
    const quotes = await getQuotes(symbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Calculate health scores per position
    const healthScores: PositionHealth[] = tracked.map((pos) =>
      calculateHealth(pos, quoteMap.get(pos.symbol) ?? null)
    );

    // Generate basic alerts
    const basicAlerts = generateAlerts(tracked, quoteMap);

    // Generate smart roll recommendations
    const rollRecs = analyzeRollOpportunities(tracked, quoteMap);
    const rollAlerts = rollRecommendationsToAlerts(rollRecs);

    // Merge: smart roll alerts replace basic ROLL alerts for the same symbol+strike
    const rollKeys = new Set(rollRecs.map((r) => `${r.symbol}:${r.strike}`));
    const filteredBasic = basicAlerts.filter((a) => {
      if (a.action !== "ROLL") return true;
      // Check if a smart roll covers this symbol+strike
      const strikeMatch = a.message.match(/\$(\d+)/);
      if (strikeMatch) {
        const key = `${a.symbol}:${parseInt(strikeMatch[1])}`;
        if (rollKeys.has(key)) return false; // smart roll replaces it
      }
      return true;
    });

    const allAlerts = [...filteredBasic, ...rollAlerts];

    // Sort by urgency
    const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    allAlerts.sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2));

    return NextResponse.json({
      alerts: allAlerts,
      rollRecommendations: rollRecs,
      healthScores,
      positionCount: activePositions.length,
      symbolsChecked: symbols.length,
    });
  } catch (e) {
    console.error("Signals error:", e);
    return NextResponse.json({ error: "Failed to generate signals" }, { status: 500 });
  }
}
