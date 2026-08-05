"use client";

import { useState } from "react";
import {
  CASE_W,
  CASE_PAD_L,
  LINE_COLORS,
  makeScale,
  shortDate,
  yTicks,
  type CaseBar,
} from "./caseChart";

export type CaseLine = {
  price: number;
  label: string;
  color?: keyof typeof LINE_COLORS;
  dash?: boolean;
};

export type CaseMarker = {
  date: string;
  label: string;
  color?: keyof typeof LINE_COLORS;
  below?: boolean;
};

interface CasePriceChartProps {
  bars?: CaseBar[];
  lines?: CaseLine[];
  markers?: CaseMarker[];
  /** shade bars strictly after this date (e.g. post-expiry) */
  shadeAfter?: string;
  title?: string;
  caption?: string;
}

const PAD_T = 16;
const PLOT_H = 168;
const H = PAD_T + PLOT_H + 30;

export default function CasePriceChart({
  bars = [],
  lines = [],
  markers = [],
  shadeAfter,
  title,
  caption,
}: CasePriceChartProps) {
  const [active, setActive] = useState<number | null>(null);

  if (bars.length === 0) return null;
  const scale = makeScale(bars, PLOT_H, PAD_T, lines.map((l) => l.price));
  const ticks = yTicks(scale.min, scale.max);
  const shadeStart = shadeAfter ? bars.findIndex((b) => b.date > shadeAfter) : -1;
  const activeBar = active != null ? bars[active] : null;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl border border-stone-100 dark:border-border-subtle shadow-sm p-4">
      {title && (
        <p className="text-sm font-semibold text-stone-800 dark:text-text mb-2">{title}</p>
      )}
      <svg viewBox={`0 0 ${CASE_W} ${H}`} className="w-full touch-none" role="img" aria-label={title || "Price chart"}>
        {/* grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={CASE_PAD_L} x2={CASE_W - 8} y1={scale.y(t)} y2={scale.y(t)} stroke="var(--border, #e7e5e4)" strokeWidth={0.5} />
            <text x={CASE_PAD_L - 5} y={scale.y(t) + 3} textAnchor="end" fontSize={9} fill="#a8a29e">
              {t >= 1000 ? t.toFixed(0) : t}
            </text>
          </g>
        ))}

        {/* post-event shading */}
        {shadeStart > 0 && (
          <rect
            x={scale.x(shadeStart) - scale.candleW}
            y={PAD_T}
            width={CASE_W - 8 - (scale.x(shadeStart) - scale.candleW)}
            height={PLOT_H}
            fill="currentColor"
            className="text-stone-400/10"
          />
        )}

        {/* candles */}
        {bars.map((b, i) => {
          const up = b.close >= b.open;
          const color = up ? "#10b981" : "#f43f5e";
          const x = scale.x(i);
          return (
            <g key={b.date} onClick={() => setActive(active === i ? null : i)} className="cursor-pointer">
              <line x1={x} x2={x} y1={scale.y(b.high)} y2={scale.y(b.low)} stroke={color} strokeWidth={1} />
              <rect
                x={x - scale.candleW / 2}
                y={scale.y(Math.max(b.open, b.close))}
                width={scale.candleW}
                height={Math.max(1, Math.abs(scale.y(b.open) - scale.y(b.close)))}
                fill={color}
                opacity={up ? 0.85 : 1}
              />
            </g>
          );
        })}

        {/* horizontal reference lines */}
        {lines.map((l) => {
          const c = LINE_COLORS[l.color || "sky"];
          return (
            <g key={`${l.label}-${l.price}`}>
              <line
                x1={CASE_PAD_L}
                x2={CASE_W - 8}
                y1={scale.y(l.price)}
                y2={scale.y(l.price)}
                stroke={c}
                strokeWidth={1.2}
                strokeDasharray={l.dash === false ? undefined : "4 3"}
              />
              <text x={CASE_W - 8} y={scale.y(l.price) - 3} textAnchor="end" fontSize={9} fontWeight={600} fill={c}>
                {l.label}
              </text>
            </g>
          );
        })}

        {/* event markers */}
        {markers.map((m) => {
          const i = bars.findIndex((b) => b.date === m.date);
          if (i === -1) return null;
          const c = LINE_COLORS[m.color || "amber"];
          const yPos = m.below ? scale.y(bars[i].low) + 12 : scale.y(bars[i].high) - 8;
          return (
            <g key={`${m.date}-${m.label}`}>
              <circle cx={scale.x(i)} cy={m.below ? scale.y(bars[i].low) + 4 : scale.y(bars[i].high) - 4} r={2.5} fill={c} />
              <text x={scale.x(i)} y={yPos + (m.below ? 8 : 0)} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={c}>
                {m.label}
              </text>
            </g>
          );
        })}

        {/* x labels */}
        {[0, Math.floor(bars.length / 2), bars.length - 1].map((i) => (
          <text key={i} x={scale.x(i)} y={H - 14} textAnchor="middle" fontSize={9} fill="#a8a29e">
            {shortDate(bars[i].date)}
          </text>
        ))}

        {/* tap readout */}
        {activeBar && (
          <text x={CASE_PAD_L} y={12} fontSize={9.5} fill="#78716c">
            {activeBar.date} · O {activeBar.open} H {activeBar.high} L {activeBar.low} C {activeBar.close}
          </text>
        )}
      </svg>
      {caption && (
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-2 leading-relaxed">{caption}</p>
      )}
      <p className="text-[10px] text-stone-300 dark:text-text-faint mt-1">Tap a candle for OHLC · real scanner data</p>
    </div>
  );
}
