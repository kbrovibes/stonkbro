import { supabaseAdmin } from "@/lib/supabase";
import type { LearnProgress } from "./curriculum";
import { CURRICULUM } from "./curriculum";

/** Get all progress records for a user */
export async function getUserProgress(
  userId: string
): Promise<LearnProgress[]> {
  const { data, error } = await supabaseAdmin
    .from("learn_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LearnProgress[];
}

/** Get progress records for a specific module */
export async function getModuleProgress(
  userId: string,
  moduleId: string
): Promise<LearnProgress[]> {
  const { data, error } = await supabaseAdmin
    .from("learn_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LearnProgress[];
}

/** Upsert progress for a lesson */
export async function saveLessonProgress(
  userId: string,
  data: {
    moduleId: string;
    lessonId: string;
    completed?: boolean;
    quizScore?: number;
    quizAnswers?: Record<string, number>;
    scrollPosition?: number;
    timeSpentSeconds?: number;
  }
): Promise<LearnProgress> {
  const now = new Date().toISOString();

  const upsertData: Record<string, unknown> = {
    user_id: userId,
    module_id: data.moduleId,
    lesson_id: data.lessonId,
    updated_at: now,
  };

  if (data.completed !== undefined) upsertData.completed = data.completed;
  if (data.quizScore !== undefined) upsertData.quiz_score = data.quizScore;
  if (data.quizAnswers !== undefined)
    upsertData.quiz_answers = data.quizAnswers;
  if (data.scrollPosition !== undefined)
    upsertData.scroll_position = data.scrollPosition;
  if (data.timeSpentSeconds !== undefined)
    upsertData.time_spent_seconds = data.timeSpentSeconds;
  if (data.completed) upsertData.completed_at = now;

  const { data: result, error } = await supabaseAdmin
    .from("learn_progress")
    .upsert(upsertData, {
      onConflict: "user_id,module_id,lesson_id",
    })
    .select()
    .single();

  if (error) throw error;
  return result as LearnProgress;
}

/** Get overall stats for a user */
export async function getOverallStats(userId: string): Promise<{
  totalLessons: number;
  completedLessons: number;
  averageQuizScore: number;
  totalTimeMinutes: number;
}> {
  const totalLessons = CURRICULUM.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );

  const progress = await getUserProgress(userId);

  const completedLessons = progress.filter((p) => p.completed).length;

  const quizScores = progress
    .filter((p) => p.quiz_score !== null)
    .map((p) => p.quiz_score as number);

  const averageQuizScore =
    quizScores.length > 0
      ? Math.round(
          quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length
        )
      : 0;

  const totalTimeSeconds = progress.reduce(
    (sum, p) => sum + (p.time_spent_seconds || 0),
    0
  );

  return {
    totalLessons,
    completedLessons,
    averageQuizScore,
    totalTimeMinutes: Math.round(totalTimeSeconds / 60),
  };
}
