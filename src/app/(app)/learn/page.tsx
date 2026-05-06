import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { CURRICULUM } from "@/lib/learn/curriculum";
import { getUserProgress, getOverallStats } from "@/lib/learn/progress";
import { calculateModuleCompletion } from "@/lib/learn/curriculum";

export const dynamic = "force-dynamic";

const COLOR_MAP: Record<string, string> = {
  "stone-500": "bg-stone-100 text-stone-600 border-stone-200",
  "blue-500": "bg-blue-50 text-blue-600 border-blue-200",
  "amber-500": "bg-amber-50 text-amber-600 border-amber-200",
  "emerald-500": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "purple-500": "bg-purple-50 text-purple-600 border-purple-200",
  "rose-500": "bg-rose-50 text-rose-600 border-rose-200",
  "cyan-500": "bg-cyan-50 text-cyan-600 border-cyan-200",
  "yellow-500": "bg-yellow-50 text-yellow-600 border-yellow-200",
  "indigo-500": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "teal-500": "bg-teal-50 text-teal-600 border-teal-200",
  "orange-500": "bg-orange-50 text-orange-600 border-orange-200",
  "lime-500": "bg-lime-50 text-lime-600 border-lime-200",
};

const PROGRESS_BAR_MAP: Record<string, string> = {
  "stone-500": "bg-stone-500",
  "blue-500": "bg-blue-500",
  "amber-500": "bg-amber-500",
  "emerald-500": "bg-emerald-500",
  "purple-500": "bg-purple-500",
  "rose-500": "bg-rose-500",
  "cyan-500": "bg-cyan-500",
  "yellow-500": "bg-yellow-500",
  "indigo-500": "bg-indigo-500",
  "teal-500": "bg-teal-500",
  "orange-500": "bg-orange-500",
  "lime-500": "bg-lime-500",
};

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user?.id ?? "";
  const [progress, stats] = await Promise.all([
    getUserProgress(userId),
    getOverallStats(userId),
  ]);

  const totalLessons = CURRICULUM.reduce((sum, m) => sum + m.lessons.length, 0) || stats.totalLessons || 0;
  const completedLessons = stats.completedLessons;
  const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const moduleCompletions = await Promise.all(
    CURRICULUM.map((mod) => calculateModuleCompletion(progress, mod.id, mod))
  );

  return (
    <div className="px-4 py-6">
      {/* Hero section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Learn the Greeks</h1>
        <p className="text-stone-500 text-sm mb-5">
          Master options Greeks from basics to advanced strategies
        </p>

        {/* Overall progress ring */}
        <div className="flex items-center justify-center">
          <div className="relative w-20 h-20">
            <svg width={80} height={80} className="-rotate-90">
              <circle cx={40} cy={40} r={34} fill="none" stroke="#e7e5e4" strokeWidth={6} />
              <circle
                cx={40}
                cy={40}
                r={34}
                fill="none"
                stroke="#0284c7"
                strokeWidth={6}
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 - (overallPct / 100) * 2 * Math.PI * 34}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-stone-800">{overallPct}%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-2">
          {completedLessons} of {totalLessons || CURRICULUM.length * 3} lessons completed
        </p>
      </div>

      {/* Module cards */}
      <div className="space-y-3">
        {CURRICULUM.map((mod, i) => {
          const pct = moduleCompletions[i];
          const completedCount = mod.lessons.filter((_, li) =>
            progress.some((p) => p.module_id === mod.id && p.lesson_id === mod.lessons[li]?.id && p.completed === true)
          ).length;
          const totalCount = mod.lessons.length;
          const colorClasses = COLOR_MAP[mod.color] || "bg-stone-100 text-stone-600 border-stone-200";
          const barColor = PROGRESS_BAR_MAP[mod.color] || "bg-stone-500";

          return (
            <Link
              key={mod.id}
              href={`/learn/${mod.id}`}
              className="block bg-white rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${colorClasses}`}
                  >
                    {mod.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-stone-900 text-sm">{mod.title}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{mod.subtitle}</p>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        {pct}% {totalCount > 0 ? `\u00B7 ${completedCount}/${totalCount} lessons` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-stone-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recommended path hint */}
      <div className="mt-6 text-center">
        <p className="text-xs text-stone-400">
          Recommended: follow the modules in order for the best learning experience
        </p>
      </div>
    </div>
  );
}
