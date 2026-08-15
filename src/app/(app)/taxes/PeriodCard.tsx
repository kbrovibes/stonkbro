"use client";

import { usePrivacy } from "@/components/PrivacyProvider";
import type { PeriodSummary } from "@/lib/taxes/estimates";
import { fmtDate, fmtMoney, fmtRange, fmtSignedMoney } from "./format";

export interface NeedsBasisItem {
  key: string;
  symbol: string;
  institution: string;
  sell_date: string;
  units: number;
  proceeds: number;
}

export default function PeriodCard({
  period,
  needsBasis = [],
}: {
  period: PeriodSummary;
  needsBasis?: NeedsBasisItem[];
}) {
  const { locked } = usePrivacy();
  const isCurrent = period.status === "current";
  const nbProceeds = needsBasis.reduce((s, n) => s + n.proceeds, 0);

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
      </div>

      {/* Short vs long term, options vs stocks — always visible */}
      <div className="px-4 pb-3 pt-1 border-t border-stone-50 dark:border-border-subtle/50">
        <TermRow
          label="Short-term"
          total={period.stcg}
          options={period.stcgOptions}
          equity={period.stcgEquity}
          locked={locked}
        />
        <TermRow
          label="Long-term"
          total={period.ltcg}
          options={period.ltcgOptions}
          equity={period.ltcgEquity}
          locked={locked}
        />
      </div>

      {needsBasis.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-700 dark:text-amber-300">
          {needsBasis.length} stock sale{needsBasis.length !== 1 ? "s" : ""} ({fmtMoney(locked, nbProceeds)} proceeds)
          missing cost basis — excluded from this math. Set basis in the Stock Sales panel below.
        </div>
      )}

      <PeriodVerdict period={period} locked={locked} />
    </div>
  );
}

function TermRow({
  label,
  total,
  options,
  equity,
  locked,
}: {
  label: string;
  total: number;
  options: number;
  equity: number;
  locked: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-xs text-stone-400 dark:text-text-faint">{label}</span>
      <span className="text-right">
        <span
          className={`text-sm font-medium tabular-nums ${
            total > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : total < 0
                ? "text-red-600 dark:text-red-400"
                : "text-stone-400 dark:text-text-faint"
          }`}
        >
          {fmtSignedMoney(locked, total)}
        </span>
        {(options !== 0 || equity !== 0) && (
          <span className="block text-[10px] text-stone-400 dark:text-text-faint tabular-nums">
            options {fmtSignedMoney(locked, options)} · stocks {fmtSignedMoney(locked, equity)}
          </span>
        )}
      </span>
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
