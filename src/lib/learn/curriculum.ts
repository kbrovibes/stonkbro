import { GREEKS_MODULES } from "@/lib/learn/content/greeks";
import { TA_MODULES } from "@/lib/learn/content/ta";
import { FLUENCY_MODULES } from "@/lib/learn/content/fluency";
import { LEVERAGE_MODULES } from "@/lib/learn/content/leverage";

export type LessonSection =
  | { type: "text"; content: string }
  | { type: "callout"; style: "tip" | "warning" | "key-concept"; content: string }
  | {
      type: "visual";
      component:
        | "delta-curve"
        | "gamma-curve"
        | "theta-decay"
        | "vega-impact"
        | "pnl-diagram"
        | "greek-table"
        | "option-chain-sim"
        | "support-resistance-chart"
        | "rsi-chart"
        | "candlestick-chart"
        | "ta-greeks-chart"
        | "long-short-diagram"
        | "sma-chart"
        | "macd-chart"
        | "bollinger-bands-chart"
        | "iv-rank-gauge"
        | "decision-tree-widget";
      props?: Record<string, unknown>;
    }
  | {
      type: "interactive";
      component:
        | "strike-slider"
        | "dte-slider"
        | "vol-slider"
        | "position-builder"
        | "greek-calculator"
        | "long-short-diagram"
        | "sma-chart"
        | "macd-chart"
        | "bollinger-bands-chart"
        | "iv-rank-gauge"
        | "decision-tree-widget"
        // 2026-08 real-interactivity suite:
        | "level-finder" // place a support/resistance line on a chart, get scored
        | "indicator-playground" // toggle SMA/EMA/RSI/MACD/BB overlays with period sliders
        | "strike-explorer" // strike/DTE/IV sliders -> premium, delta, breakeven, payoff
        | "chart-quiz"; // scenario chart + multiple-choice "what's happening here"
      props?: Record<string, unknown>;
    }
  | { type: "quiz"; questions: QuizQuestion[] };

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  sections: LessonSection[];
};

export type Module = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  level: 1 | 2;
  lessons: Lesson[];
};

export const CURRICULUM: Module[] = [
  // ─── PRACTICAL TRACKS (2026-08 overhaul) ──────────────────────────────
  // Trader fluency + toolkit, real-world leverage, crash playbook.
  ...GREEKS_MODULES,
  ...TA_MODULES,
  ...FLUENCY_MODULES,
  ...LEVERAGE_MODULES,
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────

/** Check if a lesson contains a quiz section */
export function hasQuiz(lesson: Lesson): boolean {
  return lesson.sections.some((s) => s.type === "quiz");
}

/** Get the next lesson in the curriculum, or null if at the end */
export function getNextLesson(
  curriculum: Module[],
  currentModuleId: string,
  currentLessonId: string
): { moduleId: string; lessonId: string } | null {
  for (let mi = 0; mi < curriculum.length; mi++) {
    const mod = curriculum[mi];
    if (mod.id !== currentModuleId) continue;

    const lessonIdx = mod.lessons.findIndex((l) => l.id === currentLessonId);
    if (lessonIdx === -1) return null;

    // Next lesson in same module
    if (lessonIdx < mod.lessons.length - 1) {
      return {
        moduleId: mod.id,
        lessonId: mod.lessons[lessonIdx + 1].id,
      };
    }

    // First lesson of next module
    if (mi < curriculum.length - 1) {
      return {
        moduleId: curriculum[mi + 1].id,
        lessonId: curriculum[mi + 1].lessons[0].id,
      };
    }

    // End of curriculum
    return null;
  }

  return null;
}

/** Progress record from the database */
export type LearnProgress = {
  id: string;
  user_id: string;
  module_id: string;
  lesson_id: string;
  completed: boolean;
  quiz_score: number | null;
  quiz_answers: Record<string, number> | null;
  scroll_position: number | null;
  time_spent_seconds: number;
  completed_at: string | null;
  updated_at: string;
  created_at: string;
};

/** Calculate completion percentage for a module (0-100) */
export function calculateModuleCompletion(
  progress: LearnProgress[],
  moduleId: string,
  module: Module
): number {
  const totalLessons = module.lessons.length;
  if (totalLessons === 0) return 0;

  const completedLessons = module.lessons.filter((lesson) =>
    progress.some(
      (p) =>
        p.module_id === moduleId &&
        p.lesson_id === lesson.id &&
        p.completed
    )
  ).length;

  return Math.round((completedLessons / totalLessons) * 100);
}
