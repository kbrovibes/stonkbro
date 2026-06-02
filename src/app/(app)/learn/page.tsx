import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { CURRICULUM } from "@/lib/learn/curriculum";
import { getUserProgress, getOverallStats } from "@/lib/learn/progress";
import { calculateModuleCompletion } from "@/lib/learn/curriculum";

export const dynamic = "force-dynamic";

const COLOR_MAP: Record<string, string> = {
  "stone-500": "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted border-stone-200 dark:border-border-default",
  "blue-500": "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
  "amber-500": "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
  "emerald-500": "bg-emerald-50 dark:bg-gain-bg text-emerald-600 dark:text-gain border-emerald-200 dark:border-gain-border",
  "purple-500": "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
  "rose-500": "bg-rose-50 dark:bg-loss-bg text-rose-600 dark:text-loss border-rose-200 dark:border-rose-800/50",
  "cyan-500": "bg-cyan-50 text-cyan-600 border-cyan-200",
  "yellow-500": "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50",
  "indigo-500": "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50",
  "teal-500": "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 border-teal-200 dark:border-teal-800/50",
  "orange-500": "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800/50",
  "lime-500": "bg-lime-50 dark:bg-lime-950/40 text-lime-600 dark:text-lime-300 border-lime-200 dark:border-lime-800/50",
  "sky-500": "bg-sky-50 dark:bg-accent-bg text-sky-600 dark:text-accent border-sky-200 dark:border-accent-border",
  "violet-500": "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
  "fuchsia-500": "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
  "pink-500": "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 border-pink-200 dark:border-pink-800/50",
  "green-500": "bg-green-50 dark:bg-gain-bg text-green-600 dark:text-gain border-green-200",
  "red-500": "bg-red-50 dark:bg-loss-bg text-red-600 dark:text-loss border-red-200 dark:border-loss-border",
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
  "sky-500": "bg-sky-500",
  "violet-500": "bg-violet-500",
  "fuchsia-500": "bg-fuchsia-500",
  "pink-500": "bg-pink-500",
  "green-500": "bg-green-500",
  "red-500": "bg-red-500",
};

const LEVEL_CONFIG = {
  1: {
    label: "Level 1 — Foundations",
    badge: "L1",
    badgeColor: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    description: "Options Greeks, time decay, volatility, and technical analysis basics",
  },
  2: {
    label: "Level 2 — Strategy & Selection",
    badge: "L2",
    badgeColor: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
    description: "Moving averages, momentum indicators, IV rank, and the complete options entry framework",
  },
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

  const level1Modules = CURRICULUM.filter((m) => m.level === 1);
  const level2Modules = CURRICULUM.filter((m) => m.level === 2);

  function ModuleCard({ mod, i }: { mod: typeof CURRICULUM[0]; i: number }) {
    const pct = moduleCompletions[i];
    const completedCount = mod.lessons.filter((_, li) =>
      progress.some((p) => p.module_id === mod.id && p.lesson_id === mod.lessons[li]?.id && p.completed === true)
    ).length;
    const totalCount = mod.lessons.length;
    const colorClasses = COLOR_MAP[mod.color] || "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted border-stone-200 dark:border-border-default";
    const barColor = PROGRESS_BAR_MAP[mod.color] || "bg-stone-500";

    return (
      <Link
        href={`/learn/${mod.id}`}
        className="block bg-white dark:bg-surface-elevated rounded-xl border border-stone-100 dark:border-border-subtle shadow-sm hover:shadow-md transition-shadow p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${colorClasses}`}
            >
              {mod.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-stone-900 dark:text-text text-sm">{mod.title}</h3>
              <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">{mod.subtitle}</p>

              <div className="mt-3">
                <div className="h-1.5 bg-stone-100 dark:bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-400 dark:text-text-faint mt-1">
                  {pct}% {totalCount > 0 ? `· ${completedCount}/${totalCount} lessons` : ""}
                </p>
              </div>
            </div>
          </div>

          <svg className="w-4 h-4 text-stone-300 dark:text-text-faint flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-text mb-1">Options Trading Academy</h1>
        <p className="text-stone-500 dark:text-text-subtle text-sm mb-5">
          From Greeks to strategy — master the full playbook
        </p>

        <div className="flex items-center justify-center">
          <div className="relative w-20 h-20">
            <svg width={80} height={80} className="-rotate-90">
              <circle cx={40} cy={40} r={34} fill="none" stroke="var(--border)" strokeWidth={6} />
              <circle
                cx={40}
                cy={40}
                r={34}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={6}
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 - (overallPct / 100) * 2 * Math.PI * 34}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-stone-800 dark:text-text">{overallPct}%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-text-faint mt-2">
          {completedLessons} of {totalLessons} lessons completed
        </p>
      </div>

      {/* Level 1 */}
      {level1Modules.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50">
              {LEVEL_CONFIG[1].badge}
            </span>
            <h2 className="text-sm font-semibold text-stone-700 dark:text-text-muted">{LEVEL_CONFIG[1].label}</h2>
          </div>
          <p className="text-xs text-stone-400 dark:text-text-faint mb-4">{LEVEL_CONFIG[1].description}</p>
          <div className="space-y-3">
            {level1Modules.map((mod) => {
              const i = CURRICULUM.findIndex((m) => m.id === mod.id);
              return <ModuleCard key={mod.id} mod={mod} i={i} />;
            })}
          </div>
        </div>
      )}

      {/* Level 2 */}
      {level2Modules.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50">
              {LEVEL_CONFIG[2].badge}
            </span>
            <h2 className="text-sm font-semibold text-stone-700 dark:text-text-muted">{LEVEL_CONFIG[2].label}</h2>
          </div>
          <p className="text-xs text-stone-400 dark:text-text-faint mb-4">{LEVEL_CONFIG[2].description}</p>
          <div className="space-y-3">
            {level2Modules.map((mod) => {
              const i = CURRICULUM.findIndex((m) => m.id === mod.id);
              return <ModuleCard key={mod.id} mod={mod} i={i} />;
            })}
          </div>
        </div>
      )}

      <div className="mt-4 text-center">
        <p className="text-xs text-stone-400 dark:text-text-faint">
          Complete Level 1 before advancing to Level 2 for the best learning experience
        </p>
      </div>
    </div>
  );
}
