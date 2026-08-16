import { NextResponse } from "next/server";
import { generateDailyBriefing, marketDateToday } from "@/lib/briefing/generate";
import { getLatestBriefings } from "@/lib/db/briefings";
import { runTracked } from "@/lib/jobs/tracker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  const force = new URL(request.url).searchParams.get("force") === "1";
  const today = marketDateToday();

  try {
    if (!force) {
      const existing = await getLatestBriefings(1);
      if (existing[0]?.briefing_date === today && existing[0].status === "completed") {
        return NextResponse.json({ ok: true, skipped: true, briefingId: existing[0].id });
      }
    }

    const briefing = await runTracked(
      { kind: "audio-briefing", label: "Daily audio briefing", trigger: "cron", createdBy: "cron" },
      (ctx) => generateDailyBriefing({ trigger: "cron", ctx })
    );

    return NextResponse.json({
      ok: true,
      briefingId: briefing.id,
      date: briefing.briefing_date,
      audio: !!briefing.audio_path,
      durationS: briefing.audio_duration_s,
    });
  } catch (e) {
    console.error("[Briefing] Cron failed:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
