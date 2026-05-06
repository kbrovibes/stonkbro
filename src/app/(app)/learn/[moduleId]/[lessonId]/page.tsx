"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useCallback, useState } from "react";
import { CURRICULUM } from "@/lib/learn/curriculum";
import LessonRenderer from "@/components/learn/LessonRenderer";

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

export default function LessonPage() {
  const params = useParams<{ moduleId: string; lessonId: string }>();
  const router = useRouter();
  const { moduleId, lessonId } = params;

  const mod = CURRICULUM.find((m) => m.id === moduleId);
  const lessonIndex = mod?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  const lesson = mod?.lessons[lessonIndex];

  const [completed, setCompleted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const saveProgress = useDebouncedSave(3000);

  // Mark as started on mount
  useEffect(() => {
    if (!moduleId || !lessonId) return;
    saveProgress({ moduleId, lessonId, status: "in_progress" });
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
          saveProgress({ moduleId, lessonId, status: "completed" });
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [moduleId, lessonId, completed, saveProgress]);

  const prevLesson = mod?.lessons[lessonIndex - 1];
  const nextLesson = mod?.lessons[lessonIndex + 1];

  if (!mod || !lesson) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-stone-400">Lesson not found.</p>
        <button
          onClick={() => router.push(moduleId ? `/learn/${moduleId}` : "/learn")}
          className="mt-4 text-sm text-sky-600 hover:text-sky-700 font-medium"
        >
          Back to module
        </button>
      </div>
    );
  }

  // Step dots for progress through lesson
  const totalLessons = mod.lessons.length;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-100">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/learn/${moduleId}`)}
            className="text-stone-500 hover:text-stone-700 -ml-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{lesson.title}</p>
            <p className="text-[11px] text-stone-400">{mod.title}</p>
          </div>
          <span className="text-xs text-stone-400">{lesson.estimatedMinutes}min</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1 px-4 pb-2 max-w-2xl mx-auto">
          {mod.lessons.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < lessonIndex
                  ? "bg-emerald-400"
                  : i === lessonIndex
                    ? "bg-sky-500"
                    : "bg-stone-100"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lesson content */}
      <div className="max-w-2xl mx-auto">
        <LessonRenderer sections={lesson.sections} />
      </div>

      {/* Bottom marker for completion detection */}
      <div ref={bottomRef} className="h-1" />

      {/* Navigation buttons */}
      <div className="max-w-2xl mx-auto px-4 py-6 border-t border-stone-100">
        <div className="flex items-center justify-between">
          {prevLesson ? (
            <button
              onClick={() => router.push(`/learn/${moduleId}/${prevLesson.id}`)}
              className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Previous
            </button>
          ) : (
            <div />
          )}

          <span className="text-xs text-stone-400">
            {lessonIndex + 1} of {totalLessons}
          </span>

          {nextLesson ? (
            <button
              onClick={() => router.push(`/learn/${moduleId}/${nextLesson.id}`)}
              className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Next Lesson
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => router.push(`/learn/${moduleId}`)}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
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
