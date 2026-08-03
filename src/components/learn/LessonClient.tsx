"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import LessonRenderer from "@/components/learn/LessonRenderer";
import type { LessonSection } from "@/lib/learn/curriculum";

function useDebouncedSave(delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (data: Record<string, unknown>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          await fetch("/api/learn/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
        } catch {
          // silently fail — progress save is best-effort
        }
      }, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return save;
}

interface LessonClientProps {
  moduleId: string;
  lessonId: string;
  moduleTitle: string;
  lessonTitle: string;
  estimatedMinutes: number;
  sections: LessonSection[];
  lessonIndex: number;
  totalLessons: number;
  prevLessonId: string | null;
  nextLessonId: string | null;
}

export default function LessonClient({
  moduleId,
  lessonId,
  moduleTitle,
  lessonTitle,
  estimatedMinutes,
  sections,
  lessonIndex,
  totalLessons,
  prevLessonId,
  nextLessonId,
}: LessonClientProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const saveProgress = useDebouncedSave(3000);

  // Record lesson start
  useEffect(() => {
    if (!moduleId || !lessonId) return;
    saveProgress({ moduleId, lessonId });
  }, [moduleId, lessonId, saveProgress]);

  // Auto-save scroll position
  useEffect(() => {
    const handleScroll = () => {
      saveProgress({
        moduleId,
        lessonId,
        scrollPosition: window.scrollY,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [moduleId, lessonId, saveProgress]);

  // Detect reaching bottom to mark complete
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !completed) {
          setCompleted(true);
          saveProgress({ moduleId, lessonId, completed: true });
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [moduleId, lessonId, completed, saveProgress]);

  return (
    <div className="min-h-screen bg-white dark:bg-surface-elevated">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-surface-elevated/95 backdrop-blur border-b border-stone-100 dark:border-border-subtle">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/learn/${moduleId}`)}
            className="text-stone-500 dark:text-text-subtle hover:text-stone-700 -ml-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 dark:text-text truncate">{lessonTitle}</p>
            <p className="text-[11px] text-stone-400 dark:text-text-faint">{moduleTitle}</p>
          </div>
          <span className="text-xs text-stone-400 dark:text-text-faint">{estimatedMinutes}min</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1 px-4 pb-2 max-w-2xl mx-auto">
          {Array.from({ length: totalLessons }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < lessonIndex
                  ? "bg-emerald-400"
                  : i === lessonIndex
                    ? "bg-sky-500"
                    : "bg-stone-100 dark:bg-surface-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lesson content */}
      <div className="max-w-2xl mx-auto">
        <LessonRenderer sections={sections} />
      </div>

      {/* Bottom marker for completion detection */}
      <div ref={bottomRef} className="h-1" />

      {/* Navigation buttons */}
      <div className="max-w-2xl mx-auto px-4 py-6 border-t border-stone-100 dark:border-border-subtle">
        <div className="flex items-center justify-between">
          {prevLessonId ? (
            <button
              onClick={() => router.push(`/learn/${moduleId}/${prevLessonId}`)}
              className="text-sm text-stone-500 dark:text-text-subtle hover:text-stone-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Previous
            </button>
          ) : (
            <div />
          )}

          <span className="text-xs text-stone-400 dark:text-text-faint">
            {lessonIndex + 1} of {totalLessons}
          </span>

          {nextLessonId ? (
            <button
              onClick={() => router.push(`/learn/${moduleId}/${nextLessonId}`)}
              className="text-sm font-medium text-sky-600 dark:text-accent hover:text-sky-700 flex items-center gap-1"
            >
              Next Lesson
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => router.push(`/learn/${moduleId}`)}
              className="text-sm font-medium text-emerald-600 dark:text-gain hover:text-emerald-700 flex items-center gap-1"
            >
              Complete Module
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
