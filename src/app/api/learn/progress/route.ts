import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getUserProgress,
  saveLessonProgress,
  getOverallStats,
} from "@/lib/learn/progress";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [progress, stats] = await Promise.all([
      getUserProgress(user.id),
      getOverallStats(user.id),
    ]);

    return NextResponse.json({ progress, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.moduleId || !body.lessonId) {
      return NextResponse.json(
        { error: "moduleId and lessonId are required" },
        { status: 400 }
      );
    }

    const result = await saveLessonProgress(user.id, {
      moduleId: body.moduleId,
      lessonId: body.lessonId,
      completed: body.completed,
      quizScore: body.quizScore,
      quizAnswers: body.quizAnswers,
      scrollPosition: body.scrollPosition,
      timeSpentSeconds: body.timeSpentSeconds,
    });

    return NextResponse.json({ progress: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
