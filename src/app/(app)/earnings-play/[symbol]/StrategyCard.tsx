"use client";

import type { StrategyPlan } from "@/lib/earnings-play/types";
import { CARD, EYEBROW, signedPct, signedUsd, tone, usd } from "../format";
import { PnlCurve } from "./charts";

function Range({ label, min, max }: { label: string; min: number; max: number }) {
  const same = Math.abs(max - min) < 5;
  return (
    <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-surface-muted">
      <p className={EYEBROW}>{label}</p>
      <p className="text-sm font-bold mt-1 font-mono">
        {same ? <span className={tone(min)}>{signedUsd(min)}</span> : (
          <>
            <span className={tone(min)}>{signedUsd(min)}</span>
            <span className="text-stone-400 dark:text-text-faint"> to </span>
            <span className={tone(max)}>{signedUsd(max)}</span>
          </>
        )}
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-surface-muted">
      <p className={EYEBROW}>{label}</p>
      <p className="text-sm font-bold mt-1 font-mono text-stone-900 dark:text-text">{value}</p>
      {sub ? <p className="text-[10px] text-stone-500 dark:text-text-subtle mt-0.5">{sub}</p> : null}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`${EYEBROW} mb-1.5`}>{title}</p>
      <ul className="flex flex-col gap-1.5 pl-4 list-disc marker:text-stone-300 dark:marker:text-text-faint">
        {items.map((t) => <li key={t} className="text-[13px] leading-relaxed text-stone-700 dark:text-text-muted">{t}</li>)}
      </ul>
    </div>
  );
}

export function StrategyCard({ plan, rank, spot }: { plan: StrategyPlan; rank: number; spot: number }) {
  const credit = plan.kind === "credit";
  return (
    <article className={`${CARD} overflow-hidden ${plan.bestFit ? "ring-2 ring-sky-500/60 dark:ring-accent/60" : ""}`}>
      <header className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-stone-900 dark:bg-surface-sunken text-white dark:text-text">
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold text-stone-900 dark:text-text leading-tight">{plan.name}</h3>
            <p className="text-[11px] text-stone-500 dark:text-text-subtle mt-0.5">{plan.stance}</p>
          </div>
        </div>
        {plan.bestFit ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent border border-sky-200 dark:border-accent-border shrink-0">
            Best fit
          </span>
        ) : null}
      </header>

      <div className="px-4 pb-3">
        <p className="text-sm font-semibold text-stone-900 dark:text-text">{plan.summary}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {plan.contract.map((c) => (
            <li key={c} className="text-[12px] font-mono leading-snug text-stone-600 dark:text-text-muted bg-stone-50 dark:bg-surface-muted rounded-md px-2.5 py-1.5">{c}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <Range label="If it rises 5–10%" min={plan.band.up.min} max={plan.band.up.max} />
        <Range label="If it falls 5–10%" min={plan.band.down.min} max={plan.band.down.max} />
        <Stat label={credit ? "Credit received" : "Cost to open"} value={usd(Math.abs(plan.openCash))} sub={credit ? `${usd(plan.capitalAtRisk)} held as margin` : "incl. commissions"} />
        <Stat
          label="Held to expiry"
          value={`${plan.maxGainAtExpiry == null ? "Unlimited" : `+${usd(plan.maxGainAtExpiry)}`} / −${usd(plan.maxLossAtExpiry)}`}
          sub="max gain / max loss"
        />
      </div>

      <div className="px-4 pb-1">
        <p className={EYEBROW}>P&amp;L at exit by move — shaded: the 5–10% zones</p>
        <PnlCurve curve={plan.curve} />
      </div>

      <div className="px-4 pb-3 overflow-x-auto">
        <table className="w-full text-[11px] font-mono min-w-[520px]">
          <thead>
            <tr className="text-stone-500 dark:text-text-subtle">
              <th className="text-left font-semibold py-1 pr-2">Move</th>
              {plan.scenarios.map((s) => (
                <th key={s.movePct} className={`text-right font-semibold py-1 px-1 ${Math.abs(s.movePct) >= 5 ? "text-stone-800 dark:text-text" : ""}`}>
                  {s.movePct === 0 ? "0" : signedPct(s.movePct, s.movePct % 1 ? 1 : 0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-stone-100 dark:border-border-subtle text-stone-500 dark:text-text-subtle">
              <td className="py-1 pr-2">Price</td>
              {plan.scenarios.map((s) => <td key={s.movePct} className="text-right py-1 px-1">{s.price.toFixed(0)}</td>)}
            </tr>
            <tr className="border-t border-stone-100 dark:border-border-subtle">
              <td className="py-1 pr-2 text-stone-500 dark:text-text-subtle">P&amp;L</td>
              {plan.scenarios.map((s) => <td key={s.movePct} className={`text-right py-1 px-1 font-semibold ${tone(s.pnl)}`}>{signedUsd(s.pnl)}</td>)}
            </tr>
            <tr className="border-t border-stone-100 dark:border-border-subtle">
              <td className="py-1 pr-2 text-stone-500 dark:text-text-subtle">On risk</td>
              {plan.scenarios.map((s) => (
                <td key={s.movePct} className={`text-right py-1 px-1 ${tone(s.pnl)}`}>{signedPct((s.pnl / plan.capitalAtRisk) * 100, 0)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        {plan.breakevens.length ? (
          <p className="text-[11px] text-stone-500 dark:text-text-subtle mt-1.5">
            Breakeven at exit: {plan.breakevens.map((b) => `$${b.toFixed(2)} (${signedPct((b / spot - 1) * 100)})`).join(" · ")}
          </p>
        ) : null}
      </div>

      <details open={plan.bestFit} className="group border-t border-stone-100 dark:border-border-subtle">
        <summary className="px-4 py-3 cursor-pointer text-xs font-semibold text-sky-700 dark:text-accent select-none list-none flex items-center justify-between">
          Why this trade, how it wins and loses
          <span className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="px-4 pb-4 flex flex-col gap-3.5">
          <Section title="Why this one" items={plan.why} />
          <Section title="How it makes money" items={plan.wins} />
          <Section title="How it loses" items={plan.loses} />
          <Section title="Exit plan" items={[plan.exitPlan]} />
          <Section title="Watch-outs" items={plan.warnings} />
        </div>
      </details>
    </article>
  );
}
