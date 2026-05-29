import { NextResponse, after } from "next/server";
import { initScan, executeScan } from "@/lib/portfolio-manager/runner";

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
    const t0 = Date.now();
    const { scan_id, tickers, free_cash, ticker_count } = await initScan({
      scan_type: "scheduled",
      trigger_source,
    });

    // Background-execute so the cron handler returns in <2s,
    // safely under the Hobby plan 60s function ceiling.
    after(async () => {
      try {
        await executeScan(scan_id, tickers, free_cash, undefined, t0);
      } catch (e) {
        console.error(`[cron/after] ${scan_id} failed:`, e);
      }
    });

    return NextResponse.json({ success: true, scan_id, ticker_count, queued: true });
  } catch (e) {
    console.error("[cron/portfolio-manager] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
