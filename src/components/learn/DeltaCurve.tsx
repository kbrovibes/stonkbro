"use client";

import { useState, useMemo } from "react";
import InteractiveSlider from "./InteractiveSlider";

const DTE_OPTIONS = [7, 14, 30, 45, 60, 90];

function sigmoid(x: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * x));
}

export default function DeltaCurve() {
  const [dte, setDte] = useState(30);
  const [isCall, setIsCall] = useState(true);

  const strike = 100;
  const W = 340;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 40;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const priceRange = { min: 70, max: 130 };
  const steepness = 0.15 + (90 - dte) * 0.008;

  const points = useMemo(() => {
    const pts: { x: number; y: number; price: number; delta: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const price = priceRange.min + (i / 100) * (priceRange.max - priceRange.min);
      let delta = sigmoid(price - strike, steepness);
      if (!isCall) delta = delta - 1;
      const x = PAD_L + (i / 100) * plotW;
      const yVal = isCall ? 1 - delta : -delta;
      const y = PAD_T + (1 - yVal) * plotH;
      pts.push({ x, y, price, delta });
    }
    return pts;
  }, [dte, isCall, steepness]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const atmDelta = isCall ? sigmoid(0, steepness) : sigmoid(0, steepness) - 1;

  const yLabels = isCall
    ? [
        { val: 0, label: "0" },
        { val: 0.5, label: "0.5" },
        { val: 1, label: "1.0" },
      ]
    : [
        { val: -1, label: "-1.0" },
        { val: -0.5, label: "-0.5" },
        { val: 0, label: "0" },
      ];

  const xLabels = [
    { price: 75, label: "Deep OTM" },
    { price: 100, label: "ATM" },
    { price: 125, label: "Deep ITM" },
  ];
  if (!isCall) {
    xLabels[0].label = "Deep ITM";
    xLabels[2].label = "Deep OTM";
  }

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Delta vs Stock Price</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setIsCall(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              isCall ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted"
            }`}
          >
            Call
          </button>
          <button
            onClick={() => setIsCall(false)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              !isCall ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted"
            }`}
          >
            Put
          </button>
        </div>
      </div>

      {/* ATM delta callout */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 dark:text-text-subtle">ATM Delta: </span>
        <span className={`text-lg font-bold ${isCall ? "text-blue-600" : "text-red-600 dark:text-loss"}`}>
          {atmDelta.toFixed(2)}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis labels */}
        {yLabels.map(({ val, label }) => {
          const yNorm = isCall ? 1 - val : -val;
          const y = PAD_T + (1 - yNorm) * plotH;
          return (
            <g key={val}>
              <line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} stroke="var(--border)" strokeWidth="0.5" />
              <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">
                {label}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ price, label }) => {
          const x = PAD_L + ((price - priceRange.min) / (priceRange.max - priceRange.min)) * plotW;
          return (
            <g key={price}>
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + plotH} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
              <text x={x} y={H - 8} textAnchor="middle" fontSize="8" fill="var(--text-subtle)">
                {label}
              </text>
              <text x={x} y={H - 18} textAnchor="middle" fontSize="8" fill="var(--text-faint)">
                ${price}
              </text>
            </g>
          );
        })}

        {/* Delta curve */}
        <path
          d={pathD}
          fill="none"
          stroke={isCall ? "#3b82f6" : "#ef4444"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "d 0.3s ease" }}
        />
      </svg>

      <div className="mt-3">
        <InteractiveSlider
          min={0}
          max={DTE_OPTIONS.length - 1}
          value={DTE_OPTIONS.indexOf(dte)}
          onChange={(i) => setDte(DTE_OPTIONS[i])}
          label="Days to Expiry"
          unit={` (${dte}d)`}
          step={1}
        />
      </div>
    </div>
  );
}
