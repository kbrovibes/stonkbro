import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { initScan, executeScan } from "@/lib/portfolio-manager/runner";
import { getRunningWithin } from "@/lib/db/portfolio-manager-scans";

export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Concurrency guard: refuse if a scan was started < 10 min ago and is still running
  const running = await getRunningWithin(10);
  if (running) {
    return NextResponse.json(
      { already_running: true, scan_id: running.id, started_at: running.created_at },
      { status: 409 }
    );
  }

  try {
    // Phase 1: insert row + return immediately (< 2s)
    const t0 = Date.now();
    const { scan_id, tickers, free_cash, ticker_count } = await initScan({
      scan_type: "manual",
      trigger_source: "user",
      userId: user.id,
    });

    // Phase 2: run enrichment + AI in background after response is sent.
    // `after()` keeps the function instance alive until the promise settles,
    // so this safely outlives the 60s Hobby plan response budget.
    after(async () => {
      try {
        await executeScan(scan_id, tickers, free_cash, user.id, t0);
      } catch (e) {
        console.error(`[scan/after] ${scan_id} failed:`, e);
      }
    });

    return NextResponse.json({ success: true, scan_id, ticker_count, queued: true });
  } catch (e) {
    console.error("[api/portfolio-manager/scan] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
