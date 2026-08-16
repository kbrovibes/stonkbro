import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { downloadBriefingAudio, getBriefingById } from "@/lib/db/briefings";
import { hasPortfolioAccess } from "@/lib/portfolio-access";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPortfolioAccess(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const briefing = await getBriefingById(id);
  if (!briefing?.audio_path) {
    return NextResponse.json({ error: "No audio for this briefing" }, { status: 404 });
  }

  const buffer = await downloadBriefingAudio(briefing.audio_path);
  if (!buffer) {
    return NextResponse.json({ error: "Audio file missing from storage" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
      // Audio for a given briefing id never changes — safe to cache per-user.
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
