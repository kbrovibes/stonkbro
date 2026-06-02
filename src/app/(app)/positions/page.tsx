import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import PositionFilters from "./PositionFilters";

function formatCurrency(n: number) {
  const prefix = n >= 0 ? "+$" : "-$";
  return (
    prefix +
    Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })
  );
}

function strategyBadge(strategy: string) {
  const map: Record<string, string> = {
    PMCC: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    "Covered Call": "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
    "Cash-Secured Put": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    "The Wheel": "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  };
  return map[strategy] ?? "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted";
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted" },
    closed: { label: "Closed", cls: "bg-stone-200 dark:bg-surface-sunken text-stone-500 dark:text-text-subtle" },
    rolled: { label: "Rolled", cls: "bg-sky-50 dark:bg-accent-bg text-sky-600 dark:text-accent" },
  };
  const { label, cls } = map[status] ?? map.active;
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}
    >
      {label}
    </span>
  );
}

function legLabel(type: string) {
  const map: Record<string, string> = {
    leaps_call: "LEAPS Call",
    short_call: "Short Call",
    short_put: "Short Put",
    shares: "Shares",
    long_put: "Long Put",
  };
  return map[type] ?? type;
}

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeIncome(legs: any[]) {
  // Income = sum of premiums received (short options entry prices)
  return legs
    .filter(
      (l: { type: string }) =>
        l.type === "short_call" || l.type === "short_put"
    )
    .reduce(
      (sum: number, l: { entry_price: number; quantity?: number }) =>
        sum + Math.abs(l.entry_price) * (l.quantity ?? 1) * 100,
      0
    );
}

export default async function PositionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let positions: any[] = [];
  let fetchError = false;

  if (user) {
    try {
      positions = await getPositions(user.id);
    } catch {
      fetchError = true;
    }
  }

  const activeCount = positions.filter(
    (p: { status: string }) => p.status === "active"
  ).length;
  const totalIncome = positions.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, p: any) => sum + computeIncome(p.position_legs ?? []),
    0
  );

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-stone-900 dark:text-text">Positions</h2>
        <Link
          href="/positions/new"
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-stone-900 dark:bg-surface-elevated hover:bg-stone-800 dark:hover:bg-surface-muted px-3.5 py-2 rounded-lg transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Position
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            P&L
          </p>
          <p className="text-lg font-bold mt-1 text-stone-400 dark:text-text-faint">--</p>
          <p className="text-[10px] text-stone-300 dark:text-text-faint mt-0.5">needs live data</p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Income
          </p>
          <p className="text-lg font-bold mt-1 text-stone-900 dark:text-text">
            ${totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
          <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">
            Active
          </p>
          <p className="text-lg font-bold mt-1 text-stone-900 dark:text-text">
            {activeCount}
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 p-4 mb-5">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Could not load positions. The database may not be set up yet.
          </p>
        </div>
      )}

      {/* Filter + List */}
      <PositionFilters positions={positions}>
        {/* Rendered by PositionFilters client component */}
      </PositionFilters>

      {positions.length === 0 && !fetchError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-stone-400 dark:text-text-faint"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-500 dark:text-text-subtle mb-1">
            No positions yet
          </p>
          <p className="text-xs text-stone-400 dark:text-text-faint mb-4">
            Start tracking your options trades
          </p>
          <Link
            href="/positions/new"
            className="text-xs font-semibold text-white bg-stone-900 dark:bg-surface-elevated hover:bg-stone-800 dark:hover:bg-surface-muted px-4 py-2 rounded-lg transition-colors"
          >
            Add your first position
          </Link>
        </div>
      )}
    </div>
  );
}
