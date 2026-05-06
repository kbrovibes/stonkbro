"use client";

import { useState, useMemo } from "react";
import InteractiveSlider from "./InteractiveSlider";

const DTE_OPTIONS = [3, 7, 14, 30, 45, 60, 90];

function gaussianPeak(x: number, mean: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
}

export default function GammaCurve() {
  const [dteIdx, setDteIdx] = useState(3); // default 30d
  const dte = DTE_OPTIONS[dteIdx];

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

  const sigma = 3 + dte * 0.3;
  const peakHeight = 0.08 / Math.sqrt(dte / 365);

  const points = useMemo(() => {
    const pts: { x: number; y: number; gamma: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const price = priceRange.min + (i / 100) * (priceRange.max - priceRange.min);
      const gamma = peakHeight * gaussianPeak(price, strike, sigma);
      const x = PAD_L + (i / 100) * plotW;
      const y = PAD_T + plotH - (gamma / (peakHeight * 1.15)) * plotH;
      pts.push({ x, y, gamma });
    }
    return pts;
  }, [dte, sigma, peakHeight]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const peakGamma = peakHeight;
  const peakX = PAD_L + ((strike - priceRange.min) / (priceRange.max - priceRange.min)) * plotW;
  const peakY = PAD_T + plotH - (peakGamma / (peakHeight * 1.15)) * plotH;

  const isGammaZone = dte <= 7;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Gamma vs Stock Price</h3>
        <span className="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          {dte} DTE
        </span>
      </div>

      {isGammaZone && (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800 font-medium">
          <span>&#9888;&#65039;</span> Gamma risk zone — extreme sensitivity near expiry
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#e5e7eb" strokeWidth="0.5" />
        <text x={PAD_L - 4} y={PAD_T + plotH + 3} textAnchor="end" fontSize="8" fill="#9ca3af">0</text>

        {/* X-axis labels */}
        {[80, 90, 100, 110, 120].map((price) => {
          const x = PAD_L + ((price - priceRange.min) / (priceRange.max - priceRange.min)) * plotW;
          return (
            <g key={price}>
              <line x1={x} y1={PAD_T + plotH} x2={x} y2={PAD_T + plotH + 4} stroke="#d1d5db" strokeWidth="0.5" />
              <text x={x} y={H - 10} textAnchor="middle" fontSize="8" fill="#9ca3af">
                ${price}
              </text>
            </g>
          );
        })}

        {/* ATM line */}
        <line x1={peakX} y1={PAD_T} x2={peakX} y2={PAD_T + plotH} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4,4" />
        <text x={peakX} y={H - 2} textAnchor="middle" fontSize="8" fill="#6b7280">ATM</text>

        {/* Gamma curve fill */}
        <path
          d={`${pathD} L${PAD_L + plotW},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`}
          fill={isGammaZone ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)"}
        />

        {/* Gamma curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Peak annotation */}
        <circle cx={peakX} cy={peakY} r="3" fill="#f59e0b" />
        <text x={peakX + 6} y={peakY - 6} fontSize="9" fill="#d97706" fontWeight="bold">
          {peakGamma.toFixed(4)}
        </text>
      </svg>

      <div className="mt-3">
        <InteractiveSlider
          min={0}
          max={DTE_OPTIONS.length - 1}
          value={dteIdx}
          onChange={setDteIdx}
          label="Days to Expiry"
          unit={` (${dte}d)`}
          step={1}
        />
      </div>
    </div>
  );
}
