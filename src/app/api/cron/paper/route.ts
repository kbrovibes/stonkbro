import { NextResponse } from "next/server";
import { runPaperSession } from "@/lib/paper/runner";
import { SESSIONS, type Session } from "@/lib/paper/types";

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
  const { searchParams } = new URL(request.url);
  const session = searchParams.get("session") as Session | null;
  if (!session || !SESSIONS.includes(session)) {
    return NextResponse.json({ error: "session must be open, midday or close" }, { status: 400 });
  }
  const date = searchParams.get("date") ?? undefined;

  try {
    const summary = await runPaperSession({ session, date });
    console.log(`[Paper] ${summary.date} ${session}: ${summary.status} in ${summary.ms}ms, ${summary.errors.length} errors`);
    return NextResponse.json({ ok: summary.status !== "failed", ...summary });
  } catch (e) {
    console.error("[Paper] session failed:", e);
    return NextResponse.json({ error: "Paper session failed", details: String(e) }, { status: 500 });
  }
}
