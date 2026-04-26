import { NextResponse } from "next/server";
import { generateAllRecommendations } from "@/lib/recommendations/generate";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export const maxDuration = 120; // Allow up to 2 minutes for AI generation

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await generateAllRecommendations();

    return NextResponse.json({
      success: true,
      themes: results.map((r) => ({
        theme: r.theme,
        picksCount: r.picks.length,
        generatedAt: r.generatedAt,
        expiresAt: r.expiresAt,
      })),
    });
  } catch (e) {
    console.error("Recommendations cron error:", e);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
