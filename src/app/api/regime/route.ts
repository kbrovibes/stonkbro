import { NextResponse } from "next/server";
import { getMarketRegime, type RegimeReading } from "@/lib/market/regime";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 15 * 60 * 1000;
let cached: { ts: number; reading: RegimeReading } | null = null;

export async function GET() {
  try {
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ ...cached.reading, cached: true });
    }

    const reading = await getMarketRegime();
    cached = { ts: Date.now(), reading };
    return NextResponse.json({ ...reading, cached: false });
  } catch (e) {
    console.error("Regime API error:", e);
    return NextResponse.json({ error: "Failed to read market regime" }, { status: 500 });
  }
}
