import { NextResponse } from "next/server";
import { runMarketMonitor } from "@/lib/alerts/monitor";
import { runTracked } from "@/lib/jobs/tracker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const start = Date.now();
  try {
    const result = await runTracked(
      {
        kind: "market-monitor",
        label: "Market monitor sweep",
        trigger: "cron",
        createdBy: "cron",
      },
      () => runMarketMonitor()
    );
    console.log(
      `[MarketMonitor] checked ${result.symbolsChecked} symbols, ${result.alertsNew} new alerts, ${result.pushesSent} pushes in ${Date.now() - start}ms`
    );
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - start });
  } catch (e) {
    console.error("[MarketMonitor] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
