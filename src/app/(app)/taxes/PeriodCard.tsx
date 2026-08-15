"use client";

import { usePrivacy } from "@/components/PrivacyProvider";
import type { PeriodSummary } from "@/lib/taxes/estimates";
import { fmtDate, fmtMoney, fmtRange, fmtSignedMoney } from "./format";

export default function PeriodCard({ period }: { period: PeriodSummary }) {
  const { locked } = usePrivacy();
  const isCurrent = period.status === "current";

  return (
    <div
      className={`bg-white dark:bg-surface-elevated border rounded-2xl overflow-hidden ${
        isCurrent
          ? "border-accent/40 ring-1 ring-accent/20"
          : "border-stone-100 dark:border-border-subtle"
      }`}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100 dark:border-border-subtle">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-text">
            {period.id}
            <span className="ml-2 text-xs font-normal text-stone-400 dark:text-text-faint">
              {fmtRange(period.start, period.end)}
            </span>
          </p>
          <p className="text-[11px] text-stone-400 dark:text-text-faint">
            Due {fmtDate(period.dueDate)}
          </p>
        </div>
        <StatusBadge status={period.status} />
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row label="Gains" value={fmtSignedMoney(locked, period.gains)} positive />
        <Row
          label="Losses"
          value={period.losses < 0 ? fmtSignedMoney(locked, period.losses) : fmtMoney(locked, 0)}
          negative={period.losses < 0}
        />
        <Row label="Period net" value={fmtSignedMoney(locked, period.net)} />
        <Row label="Cumulative net" value={fmtSignedMoney(locked, period.cumulativeNet)} />
        <Row label="Cumulative tax" value={fmtMoney(locked, period.cumulativeTax)} />
        <Row label="Paid" value={fmtMoney(locked, period.paid)} />
        {period.ltcg !== 0 && (
          <>
            <Row label="Short-term" value={fmtSignedMoney(locked, period.stcg)} />
            <Row label="Long-term" value={fmtSignedMoney(locked, period.ltcg)} />
          </>
        )}
      </div>

      <PeriodVerdict period={period} locked={locked} />
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-stone-400 dark:text-text-faint">{label}</span>
      <span
        className={`font-medium tabular-nums ${
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : negative
              ? "text-red-600 dark:text-red-400"
              : "text-stone-900 dark:text-text"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: PeriodSummary["status"] }) {
  const styles =
    status === "current"
      ? "bg-accent-bg text-accent"
      : status === "past"
        ? "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle"
        : "bg-stone-50 dark:bg-surface-muted text-stone-400 dark:text-text-faint";
  const label = status === "current" ? "Current" : status === "past" ? "Past" : "Upcoming";
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${styles}`}>
      {label}
    </span>
  );
}

function PeriodVerdict({ period, locked }: { period: PeriodSummary; locked: boolean }) {
  if (period.status === "future") {
    return (
      <div className="px-4 py-2.5 bg-stone-50 dark:bg-surface-muted text-xs text-stone-400 dark:text-text-faint">
        Not yet — depends on closes through {fmtDate(period.end)}.
      </div>
    );
  }

  if (period.status === "current") {
    return period.recommended > 0.5 ? (
      <div className="px-4 py-3 bg-accent-bg">
        <p className="text-sm font-semibold text-accent">
          Pay {fmtMoney(locked, period.recommended)} by {fmtDate(period.dueDate)}
        </p>
      </div>
    ) : (
      <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        Nothing due for this period — cumulative tax is covered.
      </div>
    );
  }

  // Past period: paid vs what was needed through its due date.
  const delta = period.cumulativePaid - period.cumulativeTax;
  if (period.recommended > 0.5) {
    return (
      <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-xs font-medium text-amber-700 dark:text-amber-400">
        Underpaid by {fmtMoney(locked, period.recommended)} through this period — the shortfall rolls into the next recommendation.
      </div>
    );
  }
  return (
    <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      Covered{delta > 0.5 ? ` — ${fmtMoney(locked, delta)} overpaid carries forward as credit` : ""}.
    </div>
  );
}
