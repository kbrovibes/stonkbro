import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { CURRICULUM } from "@/lib/learn/curriculum";
import { getUserProgress } from "@/lib/learn/progress";

export const dynamic = "force-dynamic";

const COLOR_MAP: Record<string, string> = {
  "stone-500": "bg-stone-100 text-stone-600",
  "blue-500": "bg-blue-50 text-blue-600",
  "amber-500": "bg-amber-50 text-amber-600",
  "emerald-500": "bg-emerald-50 text-emerald-600",
  "purple-500": "bg-purple-50 text-purple-600",
  "rose-500": "bg-rose-50 text-rose-600",
  "cyan-500": "bg-cyan-50 text-cyan-600",
  "yellow-500": "bg-yellow-50 text-yellow-600",
  "indigo-500": "bg-indigo-50 text-indigo-600",
  "teal-500": "bg-teal-50 text-teal-600",
  "orange-500": "bg-orange-50 text-orange-600",
  "lime-500": "bg-lime-50 text-lime-600",
};

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = CURRICULUM.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";
  const progress = await getUserProgress(userId);
  const moduleProgress = progress.filter((p) => p.module_id === moduleId);

  const colorClasses = COLOR_MAP[mod.color] || "bg-stone-100 text-stone-600";

  // Find the first lesson the user should continue with
  const nextLessonIndex = mod.lessons.findIndex((lesson) => {
    return !moduleProgress.some((p) => p.lesson_id === lesson.id && p.completed === true);
  });
  const continueLessonIndex = nextLessonIndex === -1 ? mod.lessons.length - 1 : nextLessonIndex;
  const continueLesson = mod.lessons[continueLessonIndex];

  return (
    <div className="px-4 py-6">
      {/* Back link */}
      <Link
        href="/learn"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        All modules
      </Link>

      {/* Module header */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClasses}`}>
          {mod.icon}
        </span>
        <div>
          <h1 className="text-xl font-bold text-stone-900">{mod.title}</h1>
          <p className="text-sm text-stone-500">{mod.subtitle}</p>
        </div>
      </div>

      {/* Lessons list */}
      {mod.lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-8 text-center">
          <p className="text-stone-400 text-sm">Lessons for this module are coming soon.</p>
          <Link
            href="/learn"
            className="inline-block mt-4 text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            Back to curriculum
          </Link>
        </div>
      ) : (
        <>
          {/* Continue button */}
          {continueLesson && (
            <Link
              href={`/learn/${moduleId}/${continueLesson.id}`}
              className="block w-full mb-4 py-3 bg-sky-600 text-white text-sm font-semibold text-center rounded-xl hover:bg-sky-700 transition-colors"
            >
              {nextLessonIndex === -1 ? "Review module" : nextLessonIndex === 0 ? "Start lesson 1" : `Continue — Lesson ${continueLessonIndex + 1}`}
            </Link>
          )}

          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden divide-y divide-stone-50">
            {mod.lessons.map((lesson, i) => {
              const lp = moduleProgress.find((p) => p.lesson_id === lesson.id);
              const isCompleted = lp?.completed === true;
              const quizScore = lp?.quiz_score;

              const prevLesson = i > 0 ? mod.lessons[i - 1] : null;
              const prevCompleted = prevLesson
                ? moduleProgress.some((p) => p.lesson_id === prevLesson.id && p.completed === true)
                : true;
              const isLocked = !prevCompleted && !isCompleted;

              const inner = (
                <>
                  <div className="flex-shrink-0 w-5 flex items-center justify-center">
                    {isCompleted ? (
                      <span className="text-emerald-500 text-base">&#10003;</span>
                    ) : isLocked ? (
                      <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-stone-200 flex items-center justify-center text-[10px] text-stone-400">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? "text-stone-500" : isLocked ? "text-stone-300" : "text-stone-900"}`}>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isLocked && (
                        <span className="text-[11px] text-stone-300">Complete previous lesson first</span>
                      )}
                      {!isLocked && quizScore !== undefined && quizScore !== null && (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Quiz: {quizScore}%
                        </span>
                      )}
                      {!isLocked && lesson.sections?.some((s) => s.type === "visual" || s.type === "interactive") && (
                        <span className="text-[11px] text-purple-500">Interactive</span>
                      )}
                    </div>
                  </div>

                  <span className={`text-xs flex-shrink-0 ${isLocked ? "text-stone-300" : "text-stone-400"}`}>
                    {lesson.estimatedMinutes}min
                  </span>
                </>
              );

              if (isLocked) {
                return (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-3.5 cursor-not-allowed">
                    {inner}
                  </div>
                );
              }

              return (
                <Link
                  key={lesson.id}
                  href={`/learn/${moduleId}/${lesson.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
