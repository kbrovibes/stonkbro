import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { runPortfolioManagerScan } from "@/lib/portfolio-manager/runner";
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
    const result = await runPortfolioManagerScan({
      scan_type: "manual",
      trigger_source: "user",
      userId: user.id,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[api/portfolio-manager/scan] failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
