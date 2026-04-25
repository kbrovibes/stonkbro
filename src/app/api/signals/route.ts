import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getQuotes } from "@/lib/market/yahoo";
import { generateAlerts, TrackedPosition } from "@/lib/options/signals";

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

    // Generate alerts
    const alerts = generateAlerts(tracked, quoteMap);

    return NextResponse.json({
      alerts,
      positionCount: activePositions.length,
      symbolsChecked: symbols.length,
    });
  } catch (e) {
    console.error("Signals error:", e);
    return NextResponse.json({ error: "Failed to generate signals" }, { status: 500 });
  }
}
