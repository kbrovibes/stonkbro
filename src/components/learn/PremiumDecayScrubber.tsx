"use client";

import { useMemo, useState } from "react";
import { CASE_W, CASE_PAD_L, LINE_COLORS, shortDate } from "./caseChart";

export type DecayPoint = {
  date: string;
  dte: number;
  mid: number;
  iv: number;
  delta: number;
  theta?: number;
};

interface PremiumDecayScrubberProps {
  title?: string;
  side?: "put" | "call";
  strike?: number;
  expiry?: string;
  /** observed scans of the same contract, oldest first */
  series?: DecayPoint[];
  caption?: string;
}

const PAD_T = 14;
const PLOT_H = 130;
const H = PAD_T + PLOT_H + 26;
const PLOT_R = CASE_W - 12;

export default function PremiumDecayScrubber({
  title = "Watch the premium decay",
  side = "put",
  strike = 0,
  expiry = "",
  series = [],
  caption,
}: PremiumDecayScrubberProps) {
  const [idx, setIdx] = useState(0);

  const geo = useMemo(() => {
    if (series.length < 2) return null;
    const maxMid = Math.max(...series.map((p) => p.mid));
    const maxIv = Math.max(...series.map((p) => p.iv));
    const x = (i: number) =>
      CASE_PAD_L + ((PLOT_R - CASE_PAD_L) * i) / (series.length - 1);
    const yMid = (v: number) => PAD_T + PLOT_H - (v / (maxMid * 1.08)) * PLOT_H;
    const yIv = (v: number) => PAD_T + PLOT_H - (v / (maxIv * 1.08)) * PLOT_H;
    const midPath = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${yMid(p.mid)}`).join("");
    const ivPath = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${yIv(p.iv)}`).join("");
    return { x, yMid, yIv, midPath, ivPath, maxMid };
  }, [series]);

  if (!geo || series.length < 2) return null;
  const pt = series[Math.min(idx, series.length - 1)];
  const first = series[0];
  const changePct = first.mid > 0 ? ((pt.mid - first.mid) / first.mid) * 100 : 0;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl border border-stone-100 dark:border-border-subtle shadow-sm p-4">
      <p className="text-sm font-semibold text-stone-800 dark:text-text mb-0.5">{title}</p>
      <p className="text-xs text-stone-500 dark:text-text-subtle mb-2">
        {side === "put" ? "Put" : "Call"} ${strike} exp {expiry} — every point is a real scan of this exact contract.
      </p>

      <svg viewBox={`0 0 ${CASE_W} ${H}`} className="w-full" role="img" aria-label="Premium decay chart">
        <path d={geo.ivPath} fill="none" stroke={LINE_COLORS.violet} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
        <path d={geo.midPath} fill="none" stroke={LINE_COLORS.sky} strokeWidth={2} />
        {series.map((p, i) => (
          <circle key={p.date} cx={geo.x(i)} cy={geo.yMid(p.mid)} r={i === idx ? 4 : 2} fill={i === idx ? LINE_COLORS.amber : LINE_COLORS.sky} />
        ))}
        <line x1={geo.x(idx)} x2={geo.x(idx)} y1={PAD_T} y2={PAD_T + PLOT_H} stroke={LINE_COLORS.amber} strokeWidth={0.8} strokeDasharray="2 2" />
        {[0, series.length - 1].map((i) => (
          <text key={i} x={geo.x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "end"} fontSize={9} fill="#a8a29e">
            {shortDate(series[i].date)} · {series[i].dte}dte
          </text>
        ))}
        <text x={CASE_PAD_L} y={10} fontSize={9} fill={LINE_COLORS.sky} fontWeight={600}>— mid</text>
        <text x={CASE_PAD_L + 44} y={10} fontSize={9} fill={LINE_COLORS.violet} fontWeight={600}>-- IV</text>
      </svg>

      <input
        type="range"
        min={0}
        max={series.length - 1}
        step={1}
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        className="w-full accent-sky-500"
        aria-label="Scrub through scan dates"
      />

      <div className="grid grid-cols-4 gap-2 mt-2 text-center">
        {[
          ["Date", pt.date.slice(5)],
          ["Mid", `$${pt.mid.toFixed(2)}`],
          ["IV", `${(pt.iv * 100).toFixed(0)}%`],
          ["Delta", pt.delta.toFixed(2)],
        ].map(([k, v]) => (
          <div key={k} className="bg-stone-50 dark:bg-surface-muted rounded-lg py-1.5">
            <p className="text-[10px] text-stone-400 dark:text-text-faint">{k}</p>
            <p className="text-xs font-semibold text-stone-800 dark:text-text">{v}</p>
          </div>
        ))}
      </div>
      <p className={`text-xs mt-2 font-medium ${changePct <= 0 ? "text-emerald-600 dark:text-gain" : "text-rose-600 dark:text-loss"}`}>
        {changePct <= 0
          ? `Premium down ${Math.abs(changePct).toFixed(0)}% since first scan — decay working for the seller.`
          : `Premium up ${changePct.toFixed(0)}% since first scan — the position moved against the seller.`}
      </p>
      {caption && <p className="text-xs text-stone-500 dark:text-text-subtle mt-1.5 leading-relaxed">{caption}</p>}
    </div>
  );
}
