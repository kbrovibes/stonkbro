import { NextResponse } from "next/server";
import { getUpcomingIPOs } from "@/lib/market/ipos";
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
    const ipos = await getUpcomingIPOs({ bypassCache: true });

    await supabaseAdmin.from("market_cache").upsert({
      key: "ipos",
      data: ipos as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, count: ipos.length });
  } catch (e) {
    console.error("IPO cron error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
