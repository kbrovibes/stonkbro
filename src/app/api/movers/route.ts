import { NextResponse } from "next/server";
import { scanForMovers } from "@/lib/analysis/movers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { movers, scannedCount } = await scanForMovers();

    return NextResponse.json({
      movers,
      scannedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Movers scan error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
