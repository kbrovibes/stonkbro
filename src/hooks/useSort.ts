import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

/**
 * Client-side table sort state. `getValue` reads the sortable value for a
 * row+column; sorting itself is a plain string/number comparison (`.sort`
 * doesn't need a stable sort here — ties keep their relative order in every
 * engine stonkbro ships to, which is what "stable enough" means in practice).
 *
 * Column-switch direction: numeric-ish columns default to descending
 * (biggest first reads as "most interesting" — P&L, size, rating), text
 * columns default to ascending (A→Z). Override per column via `ascKeys`.
 */
export function useSort<T, K extends string>(
  rows: readonly T[],
  getValue: (row: T, key: K) => string | number,
  defaultKey: K,
  opts?: { defaultDir?: SortDir; ascKeys?: readonly K[] }
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(opts?.defaultDir ?? "desc");

  const toggleSort = (key: K) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(opts?.ascKeys?.includes(key) ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb)) * dir;
      }
      return (va - vb) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getValue is an inline callback at every call site; keying on it would resort every render regardless
  }, [rows, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggleSort };
}
