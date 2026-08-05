"use client";

import { useMemo, useState } from "react";
import {
  CASE_W,
  CASE_PAD_L,
  LINE_COLORS,
  makeScale,
  shortDate,
  yTicks,
  type CaseBar,
} from "./caseChart";

interface PlaceTheStopProps {
  /** full real price path — bars after visibleUntil stay hidden until reveal */
  bars?: CaseBar[];
  visibleUntil?: string;
  strike?: number;
  /** credit received per share at entry (mid) */
  credit?: number;
  entryDate?: string;
  expiry?: string;
  /** recommended stop zone on the underlying (from the lesson's analysis) */
  guide?: { min: number; max: number };
  explanation?: string;
}

const PAD_T = 16;
const PLOT_H = 168;
const H = PAD_T + PLOT_H + 30;

export default function PlaceTheStop({
  bars = [],
  visibleUntil = "",
  strike = 0,
  credit = 0,
  entryDate = "",
  expiry = "",
  guide,
  explanation = "",
}: PlaceTheStopProps) {
  const visible = useMemo(
    () => bars.filter((b) => b.date <= visibleUntil),
    [bars, visibleUntil]
  );
  const [stop, setStop] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Scale over the FULL series so the chart doesn't jump on reveal.
  const scale = useMemo(
    () => makeScale(bars, PLOT_H, PAD_T, [strike, ...(guide ? [guide.min, guide.max] : [])]),
    [bars, strike, guide]
  );

  if (bars.length === 0 || visible.length === 0) return null;

  const ticks = yTicks(scale.min, scale.max);
  const shown = revealed ? bars : visible;
  const lastVisibleClose = visible[visible.length - 1].close;
  const stopValue = stop ?? Math.round(strike * 0.97 * 100) / 100;

  // Outcome, computed from the real path after the decision date.
  const hidden = bars.filter((b) => b.date > visibleUntil && b.date <= expiry);
  const triggerBar = hidden.find((b) => b.low <= stopValue);
  const expiryBar = hidden.length ? hidden[hidden.length - 1] : bars[bars.length - 1];
  const worstLow = hidden.length ? Math.min(...hidden.map((b) => b.low)) : lastVisibleClose;
  const intrinsicAtWorst = Math.max(0, strike - worstLow);
  const itmAtExpiry = expiryBar.close < strike;
  const inGuide = guide ? stopValue >= guide.min && stopValue <= guide.max : null;

  const verdict = !revealed
    ? null
    : triggerBar
      ? itmAtExpiry
        ? `Your stop triggered on ${triggerBar.date} near $${stopValue.toFixed(2)} — and the slide kept going (low $${worstLow.toFixed(2)}, ~$${intrinsicAtWorst.toFixed(2)}/sh intrinsic at the worst). Cutting it was the right call.`
        : `Your stop triggered on ${triggerBar.date} near $${stopValue.toFixed(2)}, but ${expiryBar.date ? `the stock closed ${expiryBar.close >= strike ? "back above" : "below"} the strike at expiry ($${expiryBar.close.toFixed(2)})` : "price recovered"} — you paid to exit a put that ${expiryBar.close >= strike ? "would have expired worthless. Stops on the underlying get shaken out by wicks" : "was still in trouble"}.`
      : itmAtExpiry
        ? `No trigger — your stop at $${stopValue.toFixed(2)} sat below the entire slide (low $${worstLow.toFixed(2)}). The put finished ~$${Math.max(0, strike - expiryBar.close).toFixed(2)}/sh ITM against $${credit.toFixed(2)} collected. That's the loss a working stop was meant to cap.`
        : `No trigger, and the put expired OTM (close $${expiryBar.close.toFixed(2)} vs $${strike} strike) — this time discipline wasn't tested. Keep the ${credit > 0 ? `${(2 * credit).toFixed(2)}–${(3 * credit).toFixed(2)} premium-stop` : "stop"} habit anyway.`;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl border border-stone-100 dark:border-border-subtle shadow-sm p-4">
      <p className="text-sm font-semibold text-stone-800 dark:text-text mb-1">
        Place your stop
      </p>
      <p className="text-xs text-stone-500 dark:text-text-subtle mb-2">
        Short the {strike} put ({expiry}) on {entryDate} for ${credit.toFixed(2)}/sh.
        Chart shows the path through {visibleUntil}. Set the underlying price where you&apos;d cut the trade.
      </p>

      <svg viewBox={`0 0 ${CASE_W} ${H}`} className="w-full touch-none" role="img" aria-label="Place-the-stop chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={CASE_PAD_L} x2={CASE_W - 8} y1={scale.y(t)} y2={scale.y(t)} stroke="var(--border, #e7e5e4)" strokeWidth={0.5} />
            <text x={CASE_PAD_L - 5} y={scale.y(t) + 3} textAnchor="end" fontSize={9} fill="#a8a29e">{t >= 1000 ? t.toFixed(0) : t}</text>
          </g>
        ))}

        {shown.map((b) => {
          const i = bars.findIndex((x) => x.date === b.date);
          const up = b.close >= b.open;
          const color = up ? "#10b981" : "#f43f5e";
          const x = scale.x(i);
          const isNew = revealed && b.date > visibleUntil;
          return (
            <g key={b.date} opacity={isNew ? 0.95 : 1}>
              <line x1={x} x2={x} y1={scale.y(b.high)} y2={scale.y(b.low)} stroke={color} strokeWidth={1} />
              <rect x={x - scale.candleW / 2} y={scale.y(Math.max(b.open, b.close))} width={scale.candleW} height={Math.max(1, Math.abs(scale.y(b.open) - scale.y(b.close)))} fill={color} opacity={up ? 0.85 : 1} />
            </g>
          );
        })}

        {/* strike */}
        <line x1={CASE_PAD_L} x2={CASE_W - 8} y1={scale.y(strike)} y2={scale.y(strike)} stroke={LINE_COLORS.sky} strokeWidth={1.2} strokeDasharray="4 3" />
        <text x={CASE_W - 8} y={scale.y(strike) - 3} textAnchor="end" fontSize={9} fontWeight={600} fill={LINE_COLORS.sky}>strike {strike}</text>

        {/* recommended zone, revealed */}
        {revealed && guide && (
          <rect x={CASE_PAD_L} y={scale.y(guide.max)} width={CASE_W - 8 - CASE_PAD_L} height={Math.abs(scale.y(guide.min) - scale.y(guide.max))} fill={LINE_COLORS.emerald} opacity={0.12} />
        )}

        {/* user's stop */}
        <line x1={CASE_PAD_L} x2={CASE_W - 8} y1={scale.y(stopValue)} y2={scale.y(stopValue)} stroke={LINE_COLORS.red} strokeWidth={1.4} />
        <text x={CASE_PAD_L + 2} y={scale.y(stopValue) - 4} fontSize={9} fontWeight={700} fill={LINE_COLORS.red}>
          your stop {stopValue.toFixed(2)}
        </text>

        {[0, bars.length - 1].map((i) => (
          <text key={i} x={scale.x(i)} y={H - 14} textAnchor="middle" fontSize={9} fill="#a8a29e">{shortDate(bars[i].date)}</text>
        ))}
      </svg>

      <input
        type="range"
        min={scale.min}
        max={scale.max}
        step={(scale.max - scale.min) / 200}
        value={stopValue}
        disabled={revealed}
        onChange={(e) => setStop(Number(e.target.value))}
        className="w-full accent-rose-500 mt-1"
        aria-label="Stop price"
      />

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full mt-2 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors"
        >
          Lock it in — show me what happened
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className={`rounded-lg border px-3 py-2.5 text-sm ${triggerBar && itmAtExpiry ? "bg-emerald-50 dark:bg-gain-bg border-emerald-200 dark:border-gain-border text-emerald-800 dark:text-gain-strong" : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200"}`}>
            {verdict}
            {guide && (
              <span className="block mt-1 text-xs opacity-80">
                {inGuide ? "Your stop sat inside the zone this lesson recommends (shaded green)." : `The recommended zone (shaded green) was $${guide.min.toFixed(2)}–$${guide.max.toFixed(2)}.`}
              </span>
            )}
          </div>
          {explanation && (
            <p className="text-xs text-stone-500 dark:text-text-subtle leading-relaxed">{explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
