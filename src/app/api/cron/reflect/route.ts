import { NextResponse } from "next/server";
import { backfillFromCspScans } from "@/lib/reflection/backfill";
import { regradeResolvedDecisions, resolveMaturedDecisions } from "@/lib/reflection/resolve";
import { computeLessons, formatLessonsBlock } from "@/lib/reflection/lessons";

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

  const startTime = Date.now();
  const url = new URL(request.url);
  const forceBackfill = url.searchParams.get("backfill") === "1";

  try {
    const backfill = await backfillFromCspScans();
    console.log(
      `[Reflect] Backfill: ${backfill.inserted} new decisions from ${backfill.scansRead} scans${forceBackfill ? " (forced)" : ""}`
    );

    const resolution = await resolveMaturedDecisions(forceBackfill ? 1000 : 200);
    console.log(`[Reflect] Resolved ${resolution.resolved} matured decisions`);
    if (resolution.errors.length > 0) {
      console.warn(`[Reflect] ${resolution.errors.length} errors:`, resolution.errors.slice(0, 5));
    }

    // One-shot after a methodology change: recompute already-graded rows.
    let regrade: { resolved: number; errors: string[] } | null = null;
    if (url.searchParams.get("regrade") === "1") {
      const regradeLimit = Number(url.searchParams.get("limit") ?? 500);
      regrade = await regradeResolvedDecisions(
        Number.isFinite(regradeLimit) ? regradeLimit : 500
      );
      console.log(`[Reflect] Regraded ${regrade.resolved} previously resolved decisions`);
    }

    const lessons = await computeLessons();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      ok: true,
      backfill,
      resolved: resolution.resolved,
      regraded: regrade?.resolved ?? 0,
      errors: resolution.errors.slice(0, 20),
      errorCount: resolution.errors.length + (regrade?.errors.length ?? 0),
      lessons,
      lessonsBlock: formatLessonsBlock(lessons),
      elapsed: `${elapsed}s`,
    });
  } catch (e) {
    console.error("[Reflect] Fatal error:", e);
    return NextResponse.json(
      { error: "Reflection run failed", details: String(e) },
      { status: 500 }
    );
  }
}
