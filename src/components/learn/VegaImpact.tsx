"use client";

import { useState, useMemo } from "react";
import InteractiveSlider from "./InteractiveSlider";

type Moneyness = "OTM" | "ATM" | "ITM";

function optionPriceByIV(iv: number, moneyness: Moneyness): number {
  const vegaMultiplier = moneyness === "ATM" ? 1.0 : moneyness === "ITM" ? 0.75 : 0.5;
  const intrinsic = moneyness === "ITM" ? 5 : 0;
  const timeValue = vegaMultiplier * iv * 0.15;
  return intrinsic + timeValue;
}

export default function VegaImpact() {
  const [moneynessIdx, setMoneynessIdx] = useState(1); // 0=OTM, 1=ATM, 2=ITM
  const [showCrush, setShowCrush] = useState(false);

  const moneynessMap: Moneyness[] = ["OTM", "ATM", "ITM"];
  const moneyness = moneynessMap[moneynessIdx];

  const W = 340;
  const H = 200;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 40;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const ivRange = { min: 10, max: 80 };
  const maxPrice = optionPriceByIV(80, "ATM") * 1.15;

  const points = useMemo(() => {
    const pts: { x: number; y: number; iv: number; price: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const iv = ivRange.min + (i / 100) * (ivRange.max - ivRange.min);
      const price = optionPriceByIV(iv, moneyness);
      const x = PAD_L + (i / 100) * plotW;
      const y = PAD_T + plotH - (price / maxPrice) * plotH;
      pts.push({ x, y, iv, price });
    }
    return pts;
  }, [moneyness, maxPrice]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // IV crush visualization
  const crushBefore = 60;
  const crushAfter = 30;
  const priceBefore = optionPriceByIV(crushBefore, moneyness);
  const priceAfter = optionPriceByIV(crushAfter, moneyness);
  const crushX1 = PAD_L + ((crushBefore - ivRange.min) / (ivRange.max - ivRange.min)) * plotW;
  const crushY1 = PAD_T + plotH - (priceBefore / maxPrice) * plotH;
  const crushX2 = PAD_L + ((crushAfter - ivRange.min) / (ivRange.max - ivRange.min)) * plotW;
  const crushY2 = PAD_T + plotH - (priceAfter / maxPrice) * plotH;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Vega: IV Impact on Price</h3>
        <button
          onClick={() => setShowCrush((s) => !s)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
            showCrush
              ? "bg-purple-500 text-white"
              : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted hover:bg-gray-200"
          }`}
        >
          {showCrush ? "Earnings ON" : "Earnings"}
        </button>
      </div>

      {showCrush && (
        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-3 text-xs">
          <div>
            <span className="text-purple-700 font-medium">IV Crush: </span>
            <span className="text-purple-900 font-bold">{crushBefore}%</span>
            <span className="text-purple-500 mx-1">&rarr;</span>
            <span className="text-purple-900 font-bold">{crushAfter}%</span>
          </div>
          <div>
            <span className="text-purple-700 font-medium">Price: </span>
            <span className="text-red-600 dark:text-loss font-bold">
              -${(priceBefore - priceAfter).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="var(--border)" strokeWidth="0.5" />

        {/* X-axis labels */}
        {[10, 20, 30, 40, 50, 60, 70, 80].map((iv) => {
          const x = PAD_L + ((iv - ivRange.min) / (ivRange.max - ivRange.min)) * plotW;
          return (
            <g key={iv}>
              <line x1={x} y1={PAD_T + plotH} x2={x} y2={PAD_T + plotH + 4} stroke="var(--border-strong)" strokeWidth="0.5" />
              <text x={x} y={H - 10} textAnchor="middle" fontSize="8" fill="var(--text-faint)">
                {iv}%
              </text>
            </g>
          );
        })}
        <text x={PAD_L + plotW / 2} y={H - 1} textAnchor="middle" fontSize="8" fill="var(--text-subtle)">
          Implied Volatility
        </text>

        {/* Y-axis label */}
        <text x={6} y={PAD_T + plotH / 2} textAnchor="middle" fontSize="8" fill="var(--text-subtle)" transform={`rotate(-90, 6, ${PAD_T + plotH / 2})`}>
          Option Price
        </text>

        {/* Price curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* IV Crush visualization */}
        {showCrush && (
          <>
            {/* Before point */}
            <circle cx={crushX1} cy={crushY1} r="5" fill="#a855f7" stroke="white" strokeWidth="2" />
            <text x={crushX1 + 8} y={crushY1 - 4} fontSize="9" fill="#7e22ce" fontWeight="bold">
              ${priceBefore.toFixed(2)}
            </text>

            {/* After point */}
            <circle cx={crushX2} cy={crushY2} r="5" fill="var(--loss)" stroke="white" strokeWidth="2" />
            <text x={crushX2 - 8} y={crushY2 + 14} fontSize="9" fill="#dc2626" fontWeight="bold" textAnchor="end">
              ${priceAfter.toFixed(2)}
            </text>

            {/* Arrow between */}
            <line
              x1={crushX1}
              y1={crushY1}
              x2={crushX2}
              y2={crushY2}
              stroke="var(--loss)"
              strokeWidth="1.5"
              strokeDasharray="4,3"
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--loss)" strokeWidth="1" />
              </marker>
            </defs>
          </>
        )}
      </svg>

      <div className="mt-3">
        <InteractiveSlider
          min={0}
          max={2}
          value={moneynessIdx}
          onChange={setMoneynessIdx}
          label="Moneyness"
          unit={` (${moneyness})`}
          step={1}
        />
      </div>
    </div>
  );
}
