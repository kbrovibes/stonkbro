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

import { hasPortfolioAccess } from "@/lib/portfolio-access";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPortfolioAccess(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const expand = searchParams.get("expand") === "full";

  // List mode: metadata only by default, full payloads if ?expand=full
  const cols = expand
    ? "snapshot_date, delta_absolute, favorable_to_hold, computed_at, payload"
    : "snapshot_date, delta_absolute, favorable_to_hold, computed_at";

  const { data, error } = await supabase
    .from("time_machine_snapshots")
    .select(cols)
    .eq("owner_email", user.email!)
    .order("snapshot_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Surface earliestAvailable + latestPayloadVersion + engine from the
  // newest payload (used by the strip UI to decide whether existing
  // snapshots are stale and need to be regenerated).
  let earliestAvailable: string | null = null;
  let latestPayloadVersion: number | null = null;
  let latestEngine: string | null = null;
  if (!expand && data && data.length > 0) {
    const { data: probe } = await supabase
      .from("time_machine_snapshots")
      .select("payload")
      .eq("owner_email", user.email!)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const p = probe?.payload as any;
    earliestAvailable = p?.earliestAvailable ?? null;
    latestPayloadVersion = typeof p?.payloadVersion === "number" ? p.payloadVersion : null;
    latestEngine = typeof p?.engine === "string" ? p.engine : null;
  } else if (expand && data && data.length > 0) {
    const p = (data[0] as any).payload as any;
    earliestAvailable = p?.earliestAvailable ?? null;
    latestPayloadVersion = typeof p?.payloadVersion === "number" ? p.payloadVersion : null;
    latestEngine = typeof p?.engine === "string" ? p.engine : null;
  }

  return NextResponse.json({
    earliestAvailable,
    latestPayloadVersion,
    latestEngine,
    snapshots: (data ?? []).map((r: any) => ({
      snapshotDate: r.snapshot_date,
      deltaAbsolute: Number(r.delta_absolute ?? 0),
      favorableToHold: !!r.favorable_to_hold,
      computedAt: r.computed_at,
      ...(expand ? { payload: r.payload } : {}),
    })),
  });
}
