import { NextResponse } from "next/server";
import { generateAllRecommendations } from "@/lib/recommendations/generate";

export const maxDuration = 120; // 2 minute timeout for AI

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // This will generate all themes including top_csp_picks
    await generateAllRecommendations();

    return NextResponse.json({
      success: true,
      message: "Options recommendations updated via cron.",
    });
  } catch (e) {
    console.error("Options cron error:", e);
    return NextResponse.json({ error: "Cron job failed", details: String(e) }, { status: 500 });
  }
}
