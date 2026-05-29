import { NextResponse } from "next/server";
import { runPortfolioManagerScan } from "@/lib/portfolio-manager/runner";

export const maxDuration = 300;

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

  const url = new URL(request.url);
  const triggerParam = url.searchParams.get("trigger");
  const trigger_source =
    triggerParam === "open" || triggerParam === "close"
      ? `cron-${triggerParam}`
      : "cron-open";

  try {
    const result = await runPortfolioManagerScan({
      scan_type: "scheduled",
      trigger_source,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[cron/portfolio-manager] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
