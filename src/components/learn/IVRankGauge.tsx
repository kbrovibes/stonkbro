"use client";

import { useState, useMemo } from "react";
import InteractiveSlider from "./InteractiveSlider";

// SVG dimensions for the semicircle gauge
const W = 340;
const H = 200;
const CX = W / 2;       // center x of the arc
const CY = 185;          // center y (near bottom so arc opens upward)
const R = 150;           // radius of the arc
const STROKE = 22;       // arc stroke width

// Angle helpers: gauge spans from 180° (left) to 0° (right), i.e. a top semicircle
// value 0 → angle 180°, value 100 → angle 0°
function valueToAngle(value: number): number {
  return Math.PI - (value / 100) * Math.PI; // radians, 0..π mapped to π..0
}

function polarToCart(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

// Build an SVG arc path between two values (0-100)
function arcPath(fromVal: number, toVal: number): string {
  const a1 = valueToAngle(fromVal);
  const a2 = valueToAngle(toVal);
  const p1 = polarToCart(CX, CY, R, a1);
  const p2 = polarToCart(CX, CY, R, a2);
  const largeArc = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

function zoneLabel(ivRank: number): { zone: string; color: string; bg: string } {
  if (ivRank <= 25) return { zone: "LOW", color: "text-green-600 dark:text-gain", bg: "bg-green-50 dark:bg-gain-bg border-green-200" };
  if (ivRank <= 74) return { zone: "MODERATE", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" };
  return { zone: "HIGH", color: "text-red-600 dark:text-loss", bg: "bg-red-50 dark:bg-loss-bg border-red-200 dark:border-loss-border" };
}

function contextText(ivRank: number): string {
  if (ivRank <= 25) {
    return "IV Rank is LOW. Options are cheap relative to history. This is a good time to BUY options (long calls/puts). Example: AAPL IV Rank at 18 before an earnings announcement.";
  }
  if (ivRank <= 74) {
    return "IV Rank is MODERATE. Options are fairly priced. Focus on directional conviction rather than IV edge. Neither buying nor selling has a strong statistical advantage right now.";
  }
  return "IV Rank is HIGH. Options are expensive relative to history. This is a good time to SELL options (covered calls, CSPs). Example: TSLA IV Rank at 82 after a big news spike.";
}

export default function IVRankGauge(_props: Record<string, unknown>) {
  const [ivRank, setIvRank] = useState(45);

  const { zone, color, bg } = useMemo(() => zoneLabel(ivRank), [ivRank]);

  // Needle tip point on the arc
  const needleAngle = valueToAngle(ivRank);
  const needleTip = polarToCart(CX, CY, R, needleAngle);
  // Needle base — a small circle at center
  const baseR = 7;
  // Two base points for the triangle needle (perpendicular to needle direction)
  const perpAngle = needleAngle + Math.PI / 2;
  const baseWidth = 5;
  const base1 = {
    x: CX + baseWidth * Math.cos(perpAngle),
    y: CY - baseWidth * Math.sin(perpAngle),
  };
  const base2 = {
    x: CX - baseWidth * Math.cos(perpAngle),
    y: CY + baseWidth * Math.sin(perpAngle),
  };

  // Zone arc paths
  const greenArc  = arcPath(0,  25);
  const yellowArc = arcPath(25, 75);
  const redArc    = arcPath(75, 100);

  // Tick marks at 0, 25, 50, 75, 100
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">IV Rank Gauge</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${bg} ${color}`}>
          {zone}
        </span>
      </div>

      {/* SVG Gauge */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Background track */}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Green zone: 0-25 */}
        <path
          d={greenArc}
          fill="none"
          stroke="#22c55e"
          strokeWidth={STROKE}
          strokeLinecap="butt"
          opacity="0.85"
        />

        {/* Yellow zone: 25-75 */}
        <path
          d={yellowArc}
          fill="none"
          stroke="#eab308"
          strokeWidth={STROKE}
          strokeLinecap="butt"
          opacity="0.85"
        />

        {/* Red zone: 75-100 */}
        <path
          d={redArc}
          fill="none"
          stroke="#ef4444"
          strokeWidth={STROKE}
          strokeLinecap="butt"
          opacity="0.85"
        />

        {/* Tick marks */}
        {ticks.map((val) => {
          const a = valueToAngle(val);
          const inner = polarToCart(CX, CY, R - STROKE / 2 - 4, a);
          const outer = polarToCart(CX, CY, R + STROKE / 2 + 4, a);
          const label = polarToCart(CX, CY, R + STROKE / 2 + 14, a);
          return (
            <g key={val}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="#6b7280" strokeWidth="1.5"
              />
              <text
                x={label.x} y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="#6b7280"
                fontWeight="500"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Zone labels on the arc */}
        <text
          x={polarToCart(CX, CY, R, valueToAngle(12)).x}
          y={polarToCart(CX, CY, R, valueToAngle(12)).y - 18}
          textAnchor="middle"
          fontSize="8"
          fill="#16a34a"
          fontWeight="600"
        >
          Buy Options
        </text>
        <text
          x={CX}
          y={CY - R - 18}
          textAnchor="middle"
          fontSize="8"
          fill="#ca8a04"
          fontWeight="600"
        >
          Neutral
        </text>
        <text
          x={polarToCart(CX, CY, R, valueToAngle(87)).x}
          y={polarToCart(CX, CY, R, valueToAngle(87)).y - 18}
          textAnchor="middle"
          fontSize="8"
          fill="#dc2626"
          fontWeight="600"
        >
          Sell Options
        </text>

        {/* Needle triangle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
          fill="#1e293b"
          opacity="0.9"
          style={{ transition: "points 0.15s ease" }}
        />
        {/* Needle pivot circle */}
        <circle cx={CX} cy={CY} r={baseR} fill="#1e293b" />
        <circle cx={CX} cy={CY} r={baseR - 3} fill="#f1f5f9" />

        {/* Center value display */}
        <text
          x={CX}
          y={CY - 22}
          textAnchor="middle"
          fontSize="13"
          fill="#374151"
          fontWeight="700"
        >
          IV Rank:
        </text>
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize="22"
          fill={ivRank <= 25 ? "#16a34a" : ivRank <= 74 ? "#ca8a04" : "#dc2626"}
          fontWeight="800"
          style={{ transition: "fill 0.2s ease" }}
        >
          {ivRank}
        </text>
      </svg>

      {/* Slider */}
      <div className="mt-1">
        <InteractiveSlider
          min={0}
          max={100}
          value={ivRank}
          onChange={setIvRank}
          label="IV Rank"
          unit="%"
          step={1}
        />
      </div>

      {/* Context panel */}
      <div
        className={`mt-3 rounded-lg border p-3 text-xs leading-relaxed text-gray-700 dark:text-text-muted transition-all duration-200 ${bg}`}
      >
        <span className={`font-bold ${color}`}>IV Rank {ivRank}%: </span>
        {contextText(ivRank)}
      </div>
    </div>
  );
}
