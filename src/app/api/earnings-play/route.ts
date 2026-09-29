import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getUpcomingEarnings } from "@/lib/earnings-play/upcoming";
import { etToday } from "@/lib/paper/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upcoming = unstable_cache(getUpcomingEarnings, ["earnings-play-upcoming", etToday()], { revalidate: 1800 });
    return NextResponse.json(await upcoming());
  } catch (e) {
    console.error("[earnings-play] upcoming failed:", e);
    return NextResponse.json({ error: "Couldn't load the earnings calendar" }, { status: 500 });
  }
}
