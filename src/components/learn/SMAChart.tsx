"use client";

import { useState, useMemo } from "react";

// Generate 120 SPY-like price points starting ~$430, ending ~$480
// Shape: downtrend → recovery → golden cross → uptrend → small pullback → higher
function generateSPYData(): number[] {
  const prices: number[] = [];
  let p = 430;

  // Phase 1 (0-20): mild downtrend with noise
  for (let i = 0; i < 20; i++) {
    p += (Math.sin(i * 0.7) * 2) - 0.4 + (((i * 7 + 13) % 5) - 2.5) * 0.6;
    prices.push(parseFloat(p.toFixed(2)));
  }

  // Phase 2 (20-40): sideways / slight recovery
  for (let i = 0; i < 20; i++) {
    p += (Math.sin(i * 1.1) * 1.5) + 0.2 + (((i * 11 + 7) % 5) - 2.5) * 0.5;
    prices.push(parseFloat(p.toFixed(2)));
  }

  // Phase 3 (40-65): strong uptrend (golden cross forms ~i=55)
  for (let i = 0; i < 25; i++) {
    p += 0.9 + (Math.sin(i * 0.5) * 1.2) + (((i * 3 + 17) % 5) - 2.5) * 0.4;
    prices.push(parseFloat(p.toFixed(2)));
  }

  // Phase 4 (65-85): continued uptrend with small pullback
  for (let i = 0; i < 20; i++) {
    const pullback = i >= 5 && i <= 10 ? -0.8 : 0.6;
    p += pullback + (Math.sin(i * 0.9) * 1.0) + (((i * 13 + 3) % 5) - 2.5) * 0.35;
    prices.push(parseFloat(p.toFixed(2)));
  }

  // Phase 5 (85-120): steady climb to ~$480
  for (let i = 0; i < 35; i++) {
    p += 0.5 + (Math.sin(i * 0.6) * 0.8) + (((i * 9 + 11) % 5) - 2.5) * 0.3;
    prices.push(parseFloat(p.toFixed(2)));
  }

  return prices;
}

function calcSMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const slice = prices.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function buildPath(
  values: (number | null)[],
  scaleX: (i: number) => number,
  scaleY: (v: number) => number
): string {
  const parts: string[] = [];
  let inLine = false;
  values.forEach((v, i) => {
    if (v === null) { inLine = false; return; }
    const x = scaleX(i);
    const y = scaleY(v);
    parts.push(`${inLine ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`);
    inLine = true;
  });
  return parts.join(" ");
}

// Find first index where sma50 crosses above sma200 (golden cross)
function findGoldenCross(sma50: (number | null)[], sma200: (number | null)[]): number | null {
  for (let i = 1; i < sma50.length; i++) {
    const prev50 = sma50[i - 1];
    const prev200 = sma200[i - 1];
    const cur50 = sma50[i];
    const cur200 = sma200[i];
    if (prev50 !== null && prev200 !== null && cur50 !== null && cur200 !== null) {
      if (prev50 <= prev200 && cur50 > cur200) return i;
    }
  }
  return null;
}

export default function SMAChart(_props: Record<string, unknown>) {
  const [show20, setShow20] = useState(true);
  const [show50, setShow50] = useState(true);
  const [show200, setShow200] = useState(true);

  const W = 600;
  const H = 280;
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 24;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const prices = useMemo(() => generateSPYData(), []);
  const sma20 = useMemo(() => calcSMA(prices, 20), [prices]);
  const sma50 = useMemo(() => calcSMA(prices, 50), [prices]);
  const sma200 = useMemo(() => calcSMA(prices, 200), [prices]);

  const allValues = [
    ...prices,
    ...sma20.filter((v): v is number => v !== null),
    ...sma50.filter((v): v is number => v !== null),
    ...sma200.filter((v): v is number => v !== null),
  ];
  const minVal = Math.min(...allValues) - 2;
  const maxVal = Math.max(...allValues) + 2;
  const n = prices.length;

  const scaleX = (i: number) => PAD_L + (i / (n - 1)) * plotW;
  const scaleY = (v: number) => PAD_T + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  const pricePath = prices
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(p).toFixed(1)}`)
    .join(" ");

  const path20 = buildPath(sma20, scaleX, scaleY);
  const path50 = buildPath(sma50, scaleX, scaleY);
  const path200 = buildPath(sma200, scaleX, scaleY);

  const goldenCrossIdx = useMemo(() => findGoldenCross(sma50, sma200), [sma50, sma200]);

  // Y-axis grid lines
  const gridPrices = [430, 440, 450, 460, 470, 480, 490].filter(
    (p) => p >= minVal && p <= maxVal
  );

  // X-axis labels: 6 months ago, 4, 2, today
  const xLabels = [
    { label: "6mo ago", frac: 0 },
    { label: "4mo ago", frac: 1 / 3 },
    { label: "2mo ago", frac: 2 / 3 },
    { label: "Today", frac: 1 },
  ];

  const toggleBtn = (active: boolean, color: string, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? `border-transparent text-white`
          : "border-gray-300 text-gray-500 dark:text-text-subtle bg-white dark:bg-surface-elevated hover:border-gray-400"
      }`}
      style={active ? { backgroundColor: color } : {}}
    >
      <span
        className="w-2.5 h-2.5 rounded-full border-2 inline-block"
        style={active ? { borderColor: "white", backgroundColor: "white" } : { borderColor: color }}
      />
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Simple Moving Averages — SPY</h3>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-text-subtle">
          <span className="flex items-center gap-1">
            <span className="w-5 h-0.5 bg-gray-400 inline-block" /> Price
          </span>
          {show20 && <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-blue-500 inline-block" /> SMA20</span>}
          {show50 && <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-orange-500 inline-block" /> SMA50</span>}
          {show200 && <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-purple-500 inline-block" /> SMA200</span>}
        </div>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="sma-arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
            <polygon points="0,6 3,0 6,6" fill="#f59e0b" />
          </marker>
          <marker id="sma-arrow-dn" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
            <polygon points="0,0 3,6 6,0" fill="#ef4444" />
          </marker>
        </defs>

        {/* Horizontal grid lines + Y labels */}
        {gridPrices.map((gp) => (
          <g key={gp}>
            <line
              x1={PAD_L} y1={scaleY(gp)}
              x2={PAD_L + plotW} y2={scaleY(gp)}
              stroke="#f3f4f6" strokeWidth="1"
            />
            <text x={PAD_L - 4} y={scaleY(gp) + 3.5} textAnchor="end" fontSize="8" fill="#9ca3af">
              ${gp}
            </text>
          </g>
        ))}

        {/* X-axis line */}
        <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="#e5e7eb" strokeWidth="1" />

        {/* X-axis labels */}
        {xLabels.map(({ label, frac }) => (
          <text
            key={label}
            x={PAD_L + frac * plotW}
            y={PAD_T + plotH + 14}
            textAnchor="middle"
            fontSize="8"
            fill="#9ca3af"
          >
            {label}
          </text>
        ))}

        {/* Golden cross annotation region */}
        {goldenCrossIdx !== null && show50 && show200 && (
          <>
            <line
              x1={scaleX(goldenCrossIdx)} y1={PAD_T}
              x2={scaleX(goldenCrossIdx)} y2={PAD_T + plotH}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity="0.7"
            />
            {/* Arrow pointing up */}
            <line
              x1={scaleX(goldenCrossIdx)}
              y1={scaleY(sma50[goldenCrossIdx] ?? 450) - 22}
              x2={scaleX(goldenCrossIdx)}
              y2={scaleY(sma50[goldenCrossIdx] ?? 450) - 6}
              stroke="#f59e0b" strokeWidth="1.5"
              markerEnd="url(#sma-arrow-up)"
            />
            <rect
              x={scaleX(goldenCrossIdx) - 34}
              y={scaleY(sma50[goldenCrossIdx] ?? 450) - 38}
              width={68} height={14}
              rx="4" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.5"
            />
            <text
              x={scaleX(goldenCrossIdx)}
              y={scaleY(sma50[goldenCrossIdx] ?? 450) - 28}
              textAnchor="middle" fontSize="8" fill="#b45309" fontWeight="700"
            >
              Golden Cross
            </text>
          </>
        )}

        {/* Price line */}
        <path d={pricePath} fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

        {/* SMA 200 — purple (slowest, draw first so others render on top) */}
        {show200 && (
          <path d={path200} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* SMA 50 — orange */}
        {show50 && (
          <path d={path50} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* SMA 20 — blue (fastest, draw on top) */}
        {show20 && (
          <path d={path20} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>

      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-text-subtle font-medium mr-1">Show:</span>
        {toggleBtn(show20, "#3b82f6", "SMA20", () => setShow20(!show20))}
        {toggleBtn(show50, "#f97316", "SMA50", () => setShow50(!show50))}
        {toggleBtn(show200, "#a855f7", "SMA200", () => setShow200(!show200))}
      </div>

      {/* Callout */}
      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
        <p className="text-xs text-amber-700 font-medium">
          <span className="font-bold">Golden Cross:</span> SMA50 crosses above SMA200 — a classic bullish signal.
          The faster MA rising above the slower one suggests the trend is shifting upward.
        </p>
      </div>
    </div>
  );
}
