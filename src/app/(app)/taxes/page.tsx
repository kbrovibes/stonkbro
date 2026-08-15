"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivacy } from "@/components/PrivacyProvider";
import type { PeriodSummary, YearSummary } from "@/lib/taxes/estimates";
import type { TaxPaymentRow } from "@/lib/db/tax-payments";
import type { TaxAssumptions } from "@/lib/taxes/config";
import PeriodCard, { type NeedsBasisItem } from "./PeriodCard";
import PaymentsPanel from "./PaymentsPanel";
import AssumptionsPanel from "./AssumptionsPanel";
import StockSalesPanel from "./StockSalesPanel";
import { fmtDate, fmtMoney, fmtSignedMoney } from "./format";

type TaxesPayload = {
  periods: PeriodSummary[];
  yearSummary: YearSummary;
  payments: TaxPaymentRow[];
  assumptions: TaxAssumptions;
  chainsAsOf: string | null;
  equities: {
    lastSyncedAt: string | null;
    saleCount: number;
    needsBasis: NeedsBasisItem[];
  };
};

const cardClass =
  "bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-2xl";

export default function TaxesPage() {
  const { locked } = usePrivacy();
  const [data, setData] = useState<TaxesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((initial = false) => {
    if (initial) setLoading(true);
    fetch("/api/taxes")
      .then(async (r) => {
        if (r.status === 403 || r.status === 401) throw new Error("Access restricted");
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || body.error || `Failed to load (${r.status})`);
        }
        return r.json();
      })
      .then((d: TaxesPayload) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 bg-stone-100 dark:bg-surface-muted rounded-lg animate-pulse w-40" />
        <div className="h-24 bg-stone-100 dark:bg-surface-muted rounded-2xl animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-stone-100 dark:bg-surface-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-8 text-center">
        <div className="text-3xl">🔒</div>
        <p className="text-stone-700 dark:text-text-muted font-medium">{error ?? "No data"}</p>
        {error === "Access restricted" && (
          <p className="text-xs text-stone-400 dark:text-text-faint">
            This page is only available for certain accounts.
          </p>
        )}
      </div>
    );
  }

  const { periods, yearSummary: ys, payments, assumptions } = data;
  const current = periods.find((p) => p.status === "current");

  return (
    <div className="flex flex-col gap-4 p-4 pb-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-text">Tax Center</h1>
        <p className="text-xs text-stone-400 dark:text-text-faint">
          Estimated taxes on {ys.taxYear} realized options + stock P&amp;L
          {data.chainsAsOf && ` · data as of ${new Date(data.chainsAsOf).toLocaleDateString()}`}
        </p>
      </div>

      {current && (
        <div className={`${cardClass} px-5 py-4 border-accent/40 ring-1 ring-accent/20`}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint mb-1">
            Next estimated payment · {current.id}
          </p>
          {current.recommended > 0.5 ? (
            <>
              <p className="text-2xl font-bold text-accent tabular-nums">
                {fmtMoney(locked, current.recommended)}
              </p>
              <p className="text-xs text-stone-500 dark:text-text-muted mt-0.5">
                Pay by {fmtDate(current.dueDate)} via IRS Direct Pay, then record it below.
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Nothing due by {fmtDate(current.dueDate)} — cumulative tax is covered.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Net realized YTD" value={fmtSignedMoney(locked, ys.net)} tone={ys.net >= 0 ? "up" : "down"} />
        <SummaryCard label="Est. tax on it" value={fmtMoney(locked, ys.tax.total)} />
        <SummaryCard label="Payments recorded" value={fmtMoney(locked, ys.totalPaid)} />
        <SummaryCard label="Remaining for year" value={fmtMoney(locked, ys.remaining)} tone={ys.remaining > 0.5 ? "warn" : "up"} />
      </div>

      {ys.net < 0 && (
        <p className="text-xs text-stone-400 dark:text-text-faint px-1">
          Net loss year so far — $0 estimated tax. Up to $3,000 of net loss can offset ordinary
          income; the rest carries forward (see Assumptions).
        </p>
      )}

      <div className={`${cardClass} px-4 py-3 grid grid-cols-2 gap-4 text-sm`}>
        <div>
          <p className="text-xs text-stone-400 dark:text-text-faint">Short-term ({pctLabel(assumptions.stcgRate)})</p>
          <p className="font-semibold text-stone-900 dark:text-text tabular-nums">
            {fmtSignedMoney(locked, ys.stcgNet)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400 dark:text-text-faint">Long-term ({pctLabel(assumptions.ltcgFederalRate)})</p>
          <p className="font-semibold text-stone-900 dark:text-text tabular-nums">
            {fmtSignedMoney(locked, ys.ltcgNet)}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-text px-1">
          IRS estimated-tax periods
        </h2>
        {periods.map((p) => (
          <PeriodCard
            key={p.id}
            period={p}
            needsBasis={data.equities.needsBasis.filter(
              (n) => n.sell_date >= p.start && n.sell_date <= p.end
            )}
          />
        ))}
      </section>

      <StockSalesPanel equities={data.equities} onChanged={() => fetchData(false)} />

      {ys.byUnderlying.length > 0 && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-stone-100 dark:border-border-subtle">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-text">Top contributors</h2>
            <p className="text-[11px] text-stone-400 dark:text-text-faint">
              By absolute realized P&amp;L · {ys.realizedCount} closed chains
            </p>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-border-subtle">
            {ys.byUnderlying.slice(0, 5).map((u) => (
              <li key={u.underlying} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="font-medium text-stone-900 dark:text-text">
                  {u.underlying}
                  <span className="ml-2 text-xs font-normal text-stone-400 dark:text-text-faint">
                    {u.chains} chain{u.chains === 1 ? "" : "s"}
                  </span>
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    u.net >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {fmtSignedMoney(locked, u.net)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PaymentsPanel payments={payments} onChanged={() => fetchData(false)} />

      <AssumptionsPanel assumptions={assumptions} />

      <p className="text-[11px] text-stone-400 dark:text-text-faint text-center px-4">
        Estimates only — not tax advice.
      </p>
    </div>
  );
}

function pctLabel(rate: number): string {
  return `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "warn";
}) {
  const valueClass =
    tone === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "down"
        ? "text-red-600 dark:text-red-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-400"
          : "text-stone-900 dark:text-text";
  return (
    <div className={`${cardClass} px-4 py-3`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
