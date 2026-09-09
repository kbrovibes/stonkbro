import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/db/admin";
import { runTracked } from "@/lib/jobs/tracker";
import { runPaperSession } from "@/lib/paper/runner";
import { SESSIONS, type Session } from "@/lib/paper/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function hasCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  let createdBy: string | null = null;
  if (hasCronBearer(request)) {
    createdBy = "cron";
  } else {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    createdBy = user.email ?? user.id;
  }

  const body = await request.json().catch(() => ({}));
  const session = body?.session as Session | undefined;
  if (!session || !SESSIONS.includes(session)) {
    return NextResponse.json({ error: "Body must include session: open | midday | close" }, { status: 400 });
  }
  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : undefined;

  try {
    const summary = await runTracked(
      {
        kind: "paper-session",
        label: `Paper ${session} session`,
        trigger: createdBy === "cron" ? "cron" : "manual",
        createdBy,
        meta: { session, date: date ?? null },
      },
      (ctx) => runPaperSession({ session, date, onProgress: (t) => ctx.progress(t) }),
    );
    return NextResponse.json({ ok: summary.status !== "failed", ...summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Paper session failed" }, { status: 500 });
  }
}
