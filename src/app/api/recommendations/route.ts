import { NextResponse } from "next/server";
import {
  getCachedRecommendations,
  generateAllRecommendations,
} from "@/lib/recommendations/generate";

export const maxDuration = 120;

export async function GET() {
  try {
    const cached = await getCachedRecommendations();
    return NextResponse.json({ recommendations: cached });
  } catch (e) {
    console.error("Recommendations fetch error:", e);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const results = await generateAllRecommendations();
    return NextResponse.json({ recommendations: results });
  } catch (e) {
    console.error("Recommendations refresh error:", e);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
