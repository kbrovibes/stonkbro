"use client";

import { signedUsd } from "../format";

const W = 600;
const H = 250;
const PAD = { l: 8, r: 52, t: 12, b: 22 };

/** Three months of closes, the 50-day, and the zone the report can move the stock into. */
export function PriceChart({ points, spot, impliedMovePct }: {
  points: Array<{ date: string; close: number; sma50: number | null }>;
  spot: number;
  impliedMovePct: number;
}) {
  if (points.length < 2) return null;
  const zoneW = 90;
  const plotR = W - PAD.r - zoneW;
  const m = impliedMovePct / 100;
  const ys = [
    ...points.map((p) => p.close),
    ...points.flatMap((p) => (p.sma50 != null ? [p.sma50] : [])),
    spot * 0.9, spot * 1.1, spot * (1 - m), spot * (1 + m),
  ];
  const lo = Math.min(...ys) * 0.99;
  const hi = Math.max(...ys) * 1.01;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (plotR - PAD.l);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (vals: Array<number | null>) =>
    vals.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(" ");

  const marks = [
    { v: spot * 1.1, label: "+10%" }, { v: spot * 1.05, label: "+5%" },
    { v: spot * 0.95, label: "−5%" }, { v: spot * 0.9, label: "−10%" },
  ];
  const first = points[0].date;
  const mid = points[Math.floor(points.length / 2)].date;
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Price history with the expected earnings move">
      <rect x={plotR + 6} y={y(spot * (1 + m))} width={zoneW - 6} height={y(spot * (1 - m)) - y(spot * (1 + m))}
        className="fill-sky-100 dark:fill-accent-bg" rx={4} />
      {marks.map((mk) => (
        <g key={mk.label}>
          <line x1={plotR + 6} x2={W - PAD.r + 4} y1={y(mk.v)} y2={y(mk.v)} strokeDasharray="3 3" className="stroke-stone-400 dark:stroke-text-faint" strokeWidth={1} />
          <text x={W - PAD.r + 8} y={y(mk.v) + 3.5} fontSize={10} className="fill-stone-500 dark:fill-text-subtle">{mk.label}</text>
        </g>
      ))}
      <text x={plotR + zoneW / 2 + 3} y={y(spot * (1 + m)) - 4} fontSize={9.5} textAnchor="middle" className="fill-sky-700 dark:fill-accent">
        ±{impliedMovePct.toFixed(1)}% priced
      </text>
      <polyline points={line(points.map((p) => p.sma50))} fill="none" strokeWidth={1.2} strokeDasharray="4 3" className="stroke-stone-400 dark:stroke-text-faint" />
      <polyline points={line(points.map((p) => p.close))} fill="none" strokeWidth={1.8} className="stroke-stone-900 dark:stroke-text" />
      <line x1={x(points.length - 1)} x2={plotR + 6} y1={y(spot)} y2={y(spot)} strokeWidth={1} className="stroke-stone-900 dark:stroke-text" />
      <circle cx={x(points.length - 1)} cy={y(spot)} r={3} className="fill-stone-900 dark:fill-text" />
      {[first, mid].map((d, i) => (
        <text key={d} x={i === 0 ? PAD.l : x(Math.floor(points.length / 2))} y={H - 6} fontSize={10} className="fill-stone-400 dark:fill-text-faint">{fmt(d)}</text>
      ))}
      <text x={plotR + zoneW / 2 + 3} y={H - 6} fontSize={10} textAnchor="middle" className="fill-stone-500 dark:fill-text-subtle">after report</text>
    </svg>
  );
}

/** P&L at the exit across −15%…+15%, with the 5–10% zones shaded. */
export function PnlCurve({ curve }: { curve: Array<{ movePct: number; pnl: number }> }) {
  const w = 600;
  const h = 150;
  const pad = { l: 44, r: 8, t: 10, b: 20 };
  const vals = curve.map((c) => c.pnl);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const x = (m: number) => pad.l + ((m + 15) / 30) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (h - pad.t - pad.b);
  const pts = curve.map((c) => `${x(c.movePct).toFixed(1)},${y(c.pnl).toFixed(1)}`).join(" ");
  const area = `${x(-15)},${y(0)} ${pts} ${x(15)},${y(0)}`;
  const id = `clip-${Math.round(hi)}-${Math.round(lo)}-${curve.length}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Profit and loss at exit by stock move">
      <defs>
        <clipPath id={`${id}-up`}><rect x={0} y={0} width={w} height={y(0)} /></clipPath>
        <clipPath id={`${id}-dn`}><rect x={0} y={y(0)} width={w} height={h} /></clipPath>
      </defs>
      {[[-10, -5], [5, 10]].map(([a, b]) => (
        <rect key={a} x={x(a)} y={pad.t} width={x(b) - x(a)} height={h - pad.t - pad.b} className="fill-stone-100 dark:fill-surface-muted" />
      ))}
      <polygon points={area} clipPath={`url(#${id}-up)`} className="fill-emerald-200/70 dark:fill-gain-bg" />
      <polygon points={area} clipPath={`url(#${id}-dn)`} className="fill-rose-200/70 dark:fill-loss-bg" />
      <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} strokeWidth={1} className="stroke-stone-400 dark:stroke-text-faint" />
      <polyline points={pts} fill="none" strokeWidth={2} className="stroke-stone-900 dark:stroke-text" />
      {[-10, -5, 0, 5, 10].map((m) => (
        <text key={m} x={x(m)} y={h - 5} fontSize={10} textAnchor="middle" className="fill-stone-500 dark:fill-text-subtle">
          {m > 0 ? `+${m}%` : m < 0 ? `−${-m}%` : "0"}
        </text>
      ))}
      {[hi, lo].filter((v) => Math.abs(v) > 1).map((v) => (
        <text key={v} x={pad.l - 4} y={y(v) + 3.5} fontSize={10} textAnchor="end" className="fill-stone-500 dark:fill-text-subtle">{signedUsd(v)}</text>
      ))}
    </svg>
  );
}
