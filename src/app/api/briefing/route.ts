import { NextResponse } from "next/server";
import { generateDailyBriefing } from "@/lib/briefing/generate";
import type { BriefingListResponse } from "@/lib/briefing/types";
import { getUser } from "@/lib/auth";
import { getLatestBriefings } from "@/lib/db/briefings";
import { runTracked } from "@/lib/jobs/tracker";
import { hasPortfolioAccess } from "@/lib/portfolio-access";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAccess(): Promise<{ userId: string } | NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPortfolioAccess(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: user.id };
}

export async function GET() {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  try {
    const briefings = await getLatestBriefings();
    const body: BriefingListResponse = { briefings };
    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Force-regenerate today's briefing. */
export async function POST() {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  try {
    const briefing = await runTracked(
      {
        kind: "audio-briefing",
        label: "Daily audio briefing (manual)",
        trigger: "manual",
        createdBy: access.userId,
      },
      (ctx) => generateDailyBriefing({ trigger: "manual", ctx })
    );
    return NextResponse.json({ ok: true, briefing });
  } catch (e) {
    console.error("[Briefing] Manual regenerate failed:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
