export default function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const color =
    score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    score >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-stone-100 text-stone-500 border-stone-200";

  const dims = size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";

  return (
    <div className={`${dims} ${color} rounded-full border flex items-center justify-center font-bold shrink-0`}>
      {score}
    </div>
  );
}
