import Link from "next/link";
import BriefingArt from "./BriefingArt";
import type { DailyBriefing } from "@/lib/briefing/types";

const MOOD_TINT: Record<string, string> = {
  up:    "from-emerald-50 dark:from-emerald-950/30",
  down:  "from-rose-50 dark:from-rose-950/30",
  mixed: "from-violet-50 dark:from-violet-950/30",
  quiet: "from-sky-50 dark:from-accent-bg/40",
};

export default function HomeBriefingCard({ briefing }: { briefing: DailyBriefing }) {
  const mood = briefing.mood ?? "quiet";
  const running = briefing.status === "running";
  const mins = briefing.audio_duration_s ? Math.max(1, Math.round(briefing.audio_duration_s / 60)) : null;

  return (
    <Link
      href="/briefing"
      className={`flex items-center gap-3 rounded-2xl border border-stone-100 dark:border-border-subtle bg-gradient-to-r ${MOOD_TINT[mood] ?? MOOD_TINT.quiet} to-white dark:to-surface-elevated px-3.5 py-3 transition-opacity hover:opacity-90`}
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
        <BriefingArt seed={briefing.art_seed ?? 7} mood={mood} className="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider font-bold text-stone-400 dark:text-text-faint">
          Today&apos;s briefing
        </p>
        <p className="text-sm font-bold text-stone-900 dark:text-text truncate">
          {running ? "Preparing today's briefing…" : briefing.title ?? "Daily briefing"}
        </p>
        {!running && briefing.summary && (
          <p className="text-[11px] text-stone-500 dark:text-text-subtle leading-snug line-clamp-2">
            {briefing.summary}
            {mins ? ` · ${mins} min` : ""}
          </p>
        )}
      </div>
      <div className="w-10 h-10 rounded-full bg-stone-900 dark:bg-accent text-white flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" className="w-4 h-4 translate-x-px" fill="currentColor">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
        </svg>
      </div>
    </Link>
  );
}
