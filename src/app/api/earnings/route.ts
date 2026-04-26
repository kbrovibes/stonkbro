import { NextRequest, NextResponse } from "next/server";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { SCAN_UNIVERSE } from "@/lib/analysis/movers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const symbolsParam = req.nextUrl.searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : SCAN_UNIVERSE;

    const earnings = await getEarningsCalendar(symbols);

    return NextResponse.json({ earnings, total: earnings.length });
  } catch (e) {
    console.error("Earnings API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch earnings calendar", earnings: [], total: 0 },
      { status: 500 }
    );
  }
}
