import { NextResponse } from "next/server";
import { backfillMissingAudio } from "@/lib/briefing/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Not on a cron schedule (see vercel.json — deliberately absent). One-off
 * maintenance route: re-runs TTS for every completed briefing that has a
 * transcript but no audio, using the chunked/retrying synthesizeBriefing.
 * Triggered manually (bearer CRON_SECRET) after the TTS reliability fix,
 * to backfill briefings that failed under the old single-shot synthesis.
 */
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
  try {
    const results = await backfillMissingAudio();
    return NextResponse.json({
      ok: true,
      attempted: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    });
  } catch (e) {
    console.error("[BriefingBackfill] Failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
