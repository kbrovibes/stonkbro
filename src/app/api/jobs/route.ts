import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { listJobs, requestCancel, sweepStaleJobs } from "@/lib/jobs/tracker";
import { jobKindInfo } from "@/lib/jobs/registry";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** List jobs (newest first) + running count. ?limit=N (default 100, max 500). */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 500);

  try {
    await sweepStaleJobs();
    const { jobs, running } = await listJobs(limit);
    const enriched = jobs.map((j) => {
      const info = jobKindInfo(j.kind);
      return { ...j, cancellable: info.cancellable, href: info.href ?? null };
    });
    return NextResponse.json({ jobs: enriched, running });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list jobs" },
      { status: 500 }
    );
  }
}

/** POST { action: "cancel", id } — flag a running job for cooperative cancel. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "cancel" || typeof body.id !== "string") {
    return NextResponse.json({ error: "Expected { action: 'cancel', id }" }, { status: 400 });
  }
  const ok = await requestCancel(body.id);
  return NextResponse.json({ ok });
}
