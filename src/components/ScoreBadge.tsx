export default function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const color =
    score >= 80 ? "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong border-emerald-200 dark:border-gain-border" :
    score >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle border-stone-200 dark:border-border-default";

  const dims = size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";

  return (
    <div className={`${dims} ${color} rounded-full border flex items-center justify-center font-bold shrink-0`}>
      {score}
    </div>
  );
}
