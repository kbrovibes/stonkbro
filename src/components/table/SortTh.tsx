"use client";

import type { SortDir } from "@/hooks/useSort";

/**
 * A `<th>` whose label is a click-to-sort toggle — the shared header cell
 * for every sortable table in the app. Pair with `useSort` for the state.
 */
export function SortTh<K extends string>({
  label,
  align = "left",
  sortKey,
  currentKey,
  currentDir,
  onToggle,
  className = "",
}: {
  label: string;
  align?: "left" | "right";
  sortKey: K;
  currentKey: K;
  currentDir: SortDir;
  onToggle: (key: K) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  const arrow = !active ? "↕" : currentDir === "asc" ? "↑" : "↓";
  return (
    <th className={`px-3 py-2 whitespace-nowrap ${align === "right" ? "text-right" : "text-left"} ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-stone-700 dark:hover:text-text transition-colors ${
          active ? "text-sky-700 dark:text-accent-hover font-semibold" : "text-stone-500 dark:text-text-subtle"
        } ${align === "right" ? "justify-end w-full" : ""}`}
      >
        <span>{label}</span>
        <span className={`text-[8px] ${active ? "opacity-100" : "opacity-40"}`}>{arrow}</span>
      </button>
    </th>
  );
}
