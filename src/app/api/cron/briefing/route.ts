import { NextResponse } from "next/server";
import { generateDailyBriefing, marketDateToday, sessionForNow } from "@/lib/briefing/generate";
import { BRIEFING_SESSIONS, isBriefingSession } from "@/lib/briefing/types";
import { deleteExpiredBriefings, hasCompletedSession } from "@/lib/db/briefings";
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

  const params = new URL(request.url).searchParams;
  const force = params.get("force") === "1";
  const sessionParam = params.get("session");
  const session = isBriefingSession(sessionParam) ? sessionParam : sessionForNow();
  const today = marketDateToday();

  try {
    if (!force && (await hasCompletedSession(today, session))) {
      return NextResponse.json({ ok: true, skipped: true, session });
    }

    const briefing = await runTracked(
      {
        kind: "audio-briefing",
        label: `Audio briefing (${BRIEFING_SESSIONS[session].label})`,
        trigger: "cron",
        createdBy: "cron",
        meta: { session },
      },
      (ctx) => generateDailyBriefing({ trigger: "cron", session, ctx })
    );

    // Retention: history surfaces one week; anything older is dead weight in storage.
    const expired = await deleteExpiredBriefings().catch(() => 0);
    if (expired > 0) console.log(`[Briefing] Swept ${expired} expired briefing(s)`);

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
