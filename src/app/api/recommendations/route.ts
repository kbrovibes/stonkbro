import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getCachedRecommendations,
  generateAllRecommendations,
  createPendingBatch,
  getRecommendationHistory,
  getRunningBatches,
} from "@/lib/recommendations/generate";

export const maxDuration = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  try {
    if (view === "history") {
      const history = await getRecommendationHistory(10);
      return NextResponse.json({ history });
    }

    if (view === "status") {
      const running = await getRunningBatches();
      return NextResponse.json({ running });
    }

    const cached = await getCachedRecommendations();
    const running = await getRunningBatches();
    return NextResponse.json({ recommendations: cached, running });
  } catch (e) {
    console.error("Recommendations fetch error:", e);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Create pending batch records immediately
    const batchId = await createPendingBatch(user?.id);

    // Generate in the background — this continues even if the client disconnects
    generateAllRecommendations(batchId, user?.id).catch((e) => {
      console.error("Background recommendation generation failed:", e);
    });

    // Return immediately with the batch ID
    return NextResponse.json({
      batchId,
      status: "running",
      message: "Recommendation generation started. Poll GET /api/recommendations?view=status to check progress.",
    });
  } catch (e) {
    console.error("Recommendations refresh error:", e);
    return NextResponse.json({ error: "Failed to start recommendations" }, { status: 500 });
  }
}
