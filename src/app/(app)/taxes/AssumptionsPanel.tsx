"use client";

import { useState } from "react";
import type { TaxAssumptions } from "@/lib/taxes/config";

const pct = (r: number) => `${(r * 100).toFixed(1).replace(/\.0$/, "")}%`;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function AssumptionsPanel({ assumptions }: { assumptions: TaxAssumptions }) {
  const [open, setOpen] = useState(false);
  const a = assumptions;

  return (
    <div className="bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-stone-900 dark:text-text">Assumptions</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-stone-400 dark:text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5 text-xs text-stone-500 dark:text-text-muted leading-relaxed">
          <p>
            <strong className="text-stone-700 dark:text-text">Income base.</strong> ~{usd(a.w2Income)} W-2
            income, fully covered by employer withholding. Everything here is the{" "}
            <em>incremental</em> tax on trading gains stacked on top.
          </p>
          <p>
            <strong className="text-stone-700 dark:text-text">Short-term rate: {pct(a.stcgRate)}.</strong>{" "}
            Top federal bracket (37%, single filer above ~$640K) plus 3.8% NIIT. Gains from{" "}
            <em>writing</em> options are always short-term regardless of holding period — IRC
            §1234(b) — so nearly all CSP / covered-call / roll income lands here.
          </p>
          <p>
            <strong className="text-stone-700 dark:text-text">Long-term rate: {pct(a.ltcgFederalRate)} federal.</strong>{" "}
            20% + 3.8% NIIT, for purchased options (long calls / LEAPS) held more than{" "}
            {a.longTermHoldingDays} days.
          </p>
          <p>
            <strong className="text-stone-700 dark:text-text">Washington.</strong> No state income tax.
            The WA {pct(a.waRate)} capital-gains excise applies only to <em>long-term</em> gains
            above the ~{usd(a.waExemption)} annual exemption — usually $0 for a short-premium
            seller. It is added automatically only if computed LTCG exceeds the exemption
            (making long-term {pct(a.ltcgFederalRate + a.waRate)} all-in above that line).
          </p>
          <p>
            <strong className="text-stone-700 dark:text-text">Losses.</strong> A net loss year owes $0
            here; up to $3,000 of net capital loss can offset ordinary income and the rest
            carries forward. That offset is not modeled — the estimate simply floors at zero.
          </p>
          <p>
            <strong className="text-stone-700 dark:text-text">Safe harbor.</strong> If employer
            withholding covers ≥ 110% of last year&apos;s total tax, underpayment penalties are
            likely already avoided — these estimated payments then mainly prevent a large
            April balance due, not penalties. Verify against last year&apos;s return.
          </p>
          <p className="text-stone-400 dark:text-text-faint">
            Estimates only — not tax advice. Assignment stock-side P&amp;L, wash sales, and the
            $3K ordinary-loss offset are not modeled. Confirm with a CPA before filing.
          </p>
        </div>
      )}
    </div>
  );
}
