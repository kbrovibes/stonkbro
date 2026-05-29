import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getLatestCompleted,
  getRunningWithin,
} from "@/lib/db/portfolio-manager-scans";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scan, running] = await Promise.all([
    getLatestCompleted(),
    getRunningWithin(15),
  ]);

  return NextResponse.json({
    scan,
    refreshing: running
      ? { scan_id: running.id, started_at: running.created_at }
      : null,
  });
}
