/**
 * Lightweight cache reader for Time Machine.
 *
 *   GET /api/portfolio/time-machine/cached
 *     → list of { snapshotDate, deltaAbsolute, favorableToHold, computedAt }
 *
 *   GET /api/portfolio/time-machine/cached?date=YYYY-MM-DD
 *     → full payload for that snapshot date (404 if missing)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_EMAIL = "k4rthikr@gmail.com";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.email !== ALLOWED_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid ?date=YYYY-MM-DD" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("time_machine_snapshots")
      .select("payload, computed_at")
      .eq("snapshot_date", date)
      .eq("owner_email", user.email!)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "No cached snapshot for that date" }, { status: 404 });

    return NextResponse.json({ ...(data.payload as object), _computedAt: data.computed_at });
  }

  // List mode: all snapshots, newest first, metadata only.
  const { data, error } = await supabase
    .from("time_machine_snapshots")
    .select("snapshot_date, delta_absolute, favorable_to_hold, computed_at")
    .eq("owner_email", user.email!)
    .order("snapshot_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    snapshots: (data ?? []).map((r) => ({
      snapshotDate: r.snapshot_date,
      deltaAbsolute: Number(r.delta_absolute ?? 0),
      favorableToHold: !!r.favorable_to_hold,
      computedAt: r.computed_at,
    })),
  });
}
