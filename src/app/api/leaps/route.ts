import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getLatestLeapsScan, insertLeapsScan, listPins } from "@/lib/db/leaps";
import { runLeapsPmccScan, scanUniverse } from "@/lib/options/leaps-scan";
import { runTracked } from "@/lib/jobs/tracker";

export const maxDuration = 300;

/** GET — the latest scan and the caller's pins. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [scan, pins] = await Promise.all([getLatestLeapsScan(), listPins(user.id)]);
  return NextResponse.json({ scan, pins });
}

/** POST { action: "run" } — run the scan now. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let action: string | null = null;
  try {
    const body = (await request.json()) as { action?: string };
    action = body.action ?? null;
  } catch {
    /* no body */
  }
  if (action !== "run") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const tickers = scanUniverse();
  const scanId = await runTracked(
    {
      kind: "leaps-scan",
      label: "LEAPS + PMCC scan",
      trigger: "manual",
      createdBy: user.email ?? null,
      meta: { tickers: tickers.length },
    },
    async (ctx) => {
      const result = await runLeapsPmccScan({
        tickers,
        onProgress: (done, total) => ctx.progress(`${done} / ${total} chains`),
      });
      return insertLeapsScan(result, "manual");
    }
  );

  const scan = await getLatestLeapsScan();
  return NextResponse.json({ scanId, scan });
}
