import Link from "next/link";
import { CURRICULUM } from "@/lib/learn/curriculum";
import LessonClient from "@/components/learn/LessonClient";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const { moduleId, lessonId } = await params;

  const mod = CURRICULUM.find((m) => m.id === moduleId);
  const lessonIndex = mod?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  const lesson = mod && lessonIndex >= 0 ? mod.lessons[lessonIndex] : undefined;

  if (!mod || !lesson) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-stone-400 dark:text-text-faint">Lesson not found.</p>
        <Link
          href={moduleId ? `/learn/${moduleId}` : "/learn"}
          className="mt-4 inline-block text-sm text-sky-600 dark:text-accent hover:text-sky-700 font-medium"
        >
          Back to module
        </Link>
      </div>
    );
  }

  return (
    <LessonClient
      moduleId={moduleId}
      lessonId={lessonId}
      moduleTitle={mod.title}
      lessonTitle={lesson.title}
      estimatedMinutes={lesson.estimatedMinutes}
      sections={lesson.sections}
      lessonIndex={lessonIndex}
      totalLessons={mod.lessons.length}
      prevLessonId={mod.lessons[lessonIndex - 1]?.id ?? null}
      nextLessonId={mod.lessons[lessonIndex + 1]?.id ?? null}
    />
  );
}
