"use client";

import { useState, useMemo } from "react";

interface RSIChartProps {
  mode?: "default" | "divergence" | "strategy";
  showZones?: boolean;
  period?: number;
  divergenceType?: "bullish" | "bearish";
  showSupportResistance?: boolean;
}

// Generate synthetic price + RSI data
function generateData(mode: string, divergenceType?: string): { price: number; rsi: number }[] {
  if (mode === "divergence" && divergenceType === "bullish") {
    // Price makes lower low, RSI makes higher low
    return [
      { price: 105, rsi: 55 }, { price: 103, rsi: 50 }, { price: 100, rsi: 42 },
      { price: 97, rsi: 35 }, { price: 94, rsi: 28 }, { price: 96, rsi: 40 },
      { price: 99, rsi: 48 }, { price: 101, rsi: 52 }, { price: 98, rsi: 44 },
      { price: 95, rsi: 36 }, { price: 92, rsi: 32 }, { price: 94, rsi: 42 },
      { price: 97, rsi: 50 }, { price: 100, rsi: 55 }, { price: 103, rsi: 60 },
    ];
  }

  if (mode === "strategy") {
    return [
      { price: 100, rsi: 50 }, { price: 103, rsi: 58 }, { price: 106, rsi: 65 },
      { price: 108, rsi: 72 }, { price: 107, rsi: 68 }, { price: 104, rsi: 55 },
      { price: 100, rsi: 45 }, { price: 97, rsi: 35 }, { price: 94, rsi: 27 },
      { price: 93, rsi: 24 }, { price: 95, rsi: 32 }, { price: 98, rsi: 42 },
      { price: 101, rsi: 52 }, { price: 104, rsi: 60 }, { price: 107, rsi: 70 },
      { price: 109, rsi: 75 }, { price: 108, rsi: 70 }, { price: 105, rsi: 58 },
    ];
  }

  // Default
  return [
    { price: 100, rsi: 50 }, { price: 103, rsi: 58 }, { price: 106, rsi: 67 },
    { price: 108, rsi: 73 }, { price: 107, rsi: 69 }, { price: 105, rsi: 60 },
    { price: 102, rsi: 48 }, { price: 99, rsi: 38 }, { price: 96, rsi: 30 },
    { price: 94, rsi: 25 }, { price: 95, rsi: 32 }, { price: 98, rsi: 42 },
    { price: 101, rsi: 52 }, { price: 104, rsi: 62 }, { price: 106, rsi: 68 },
    { price: 105, rsi: 65 }, { price: 103, rsi: 55 }, { price: 100, rsi: 45 },
  ];
}

export default function RSIChart({
  mode = "default",
  showZones = true,
  divergenceType = "bullish",
  showSupportResistance = false,
}: RSIChartProps) {
  const [showPrice, setShowPrice] = useState(true);

  const W = 360;
  const H_PRICE = 120;
  const H_RSI = 120;
  const H = H_PRICE + H_RSI + 20;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const GAP = 20;

  const plotW = W - PAD_L - PAD_R;

  const data = useMemo(() => generateData(mode, divergenceType), [mode, divergenceType]);

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices) - 2;
  const maxPrice = Math.max(...prices) + 2;

  const scaleX = (i: number) => PAD_L + (i / (data.length - 1)) * plotW;
  const scalePriceY = (p: number) => PAD_T + (H_PRICE - ((p - minPrice) / (maxPrice - minPrice)) * H_PRICE);
  const scaleRSIY = (r: number) => PAD_T + H_PRICE + GAP + (H_RSI - (r / 100) * H_RSI);

  const pricePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scalePriceY(d.price)}`).join(" ");
  const rsiPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleRSIY(d.rsi)}`).join(" ");

  // Find overbought/oversold zones for highlighting
  const obZones: { start: number; end: number }[] = [];
  const osZones: { start: number; end: number }[] = [];
  let obStart: number | null = null;
  let osStart: number | null = null;

  data.forEach((d, i) => {
    if (d.rsi >= 70 && obStart === null) obStart = i;
    if (d.rsi < 70 && obStart !== null) { obZones.push({ start: obStart, end: i - 1 }); obStart = null; }
    if (d.rsi <= 30 && osStart === null) osStart = i;
    if (d.rsi > 30 && osStart !== null) { osZones.push({ start: osStart, end: i - 1 }); osStart = null; }
  });
  if (obStart !== null) obZones.push({ start: obStart, end: data.length - 1 });
  if (osStart !== null) osZones.push({ start: osStart, end: data.length - 1 });

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">
          {mode === "divergence" ? `RSI Divergence (${divergenceType})` : "RSI Indicator"}
        </h3>
        <button
          onClick={() => setShowPrice(!showPrice)}
          className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
            showPrice ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted"
          }`}
        >
          Price
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Price panel */}
        {showPrice && (
          <g>
            <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize="8" fill="#6b7280" fontWeight="600">
              Price
            </text>

            {/* Support/Resistance lines for strategy mode */}
            {showSupportResistance && (
              <>
                <line
                  x1={PAD_L} y1={scalePriceY(108)} x2={PAD_L + plotW} y2={scalePriceY(108)}
                  stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3"
                />
                <text x={PAD_L + plotW - 2} y={scalePriceY(108) - 4} textAnchor="end" fontSize="7" fill="#dc2626">R: $108</text>
                <line
                  x1={PAD_L} y1={scalePriceY(93)} x2={PAD_L + plotW} y2={scalePriceY(93)}
                  stroke="#10b981" strokeWidth="1" strokeDasharray="4,3"
                />
                <text x={PAD_L + plotW - 2} y={scalePriceY(93) + 10} textAnchor="end" fontSize="7" fill="#059669">S: $93</text>
              </>
            )}

            {/* Price line */}
            <path d={pricePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Price dots */}
            {data.map((d, i) => (
              <circle key={i} cx={scaleX(i)} cy={scalePriceY(d.price)} r="2" fill="#3b82f6" />
            ))}

            {/* Y-axis prices */}
            {[minPrice, (minPrice + maxPrice) / 2, maxPrice].map((p) => (
              <text key={p} x={PAD_L - 4} y={scalePriceY(p) + 3} textAnchor="end" fontSize="7" fill="#9ca3af">
                ${Math.round(p)}
              </text>
            ))}
          </g>
        )}

        {/* RSI panel */}
        <g>
          <text x={PAD_L - 4} y={PAD_T + H_PRICE + GAP + 4} textAnchor="end" fontSize="8" fill="#6b7280" fontWeight="600">
            RSI
          </text>

          {/* Overbought/Oversold zones */}
          {showZones && (
            <>
              {/* Overbought zone (70-100) */}
              <rect
                x={PAD_L}
                y={scaleRSIY(100)}
                width={plotW}
                height={scaleRSIY(70) - scaleRSIY(100)}
                fill="rgba(239,68,68,0.06)"
              />
              <line
                x1={PAD_L} y1={scaleRSIY(70)} x2={PAD_L + plotW} y2={scaleRSIY(70)}
                stroke="#fca5a5" strokeWidth="1" strokeDasharray="4,3"
              />
              <text x={PAD_L + plotW + 2} y={scaleRSIY(70) + 3} fontSize="7" fill="#ef4444">70</text>

              {/* Oversold zone (0-30) */}
              <rect
                x={PAD_L}
                y={scaleRSIY(30)}
                width={plotW}
                height={scaleRSIY(0) - scaleRSIY(30)}
                fill="rgba(16,185,129,0.06)"
              />
              <line
                x1={PAD_L} y1={scaleRSIY(30)} x2={PAD_L + plotW} y2={scaleRSIY(30)}
                stroke="#86efac" strokeWidth="1" strokeDasharray="4,3"
              />
              <text x={PAD_L + plotW + 2} y={scaleRSIY(30) + 3} fontSize="7" fill="#10b981">30</text>

              {/* 50 line */}
              <line
                x1={PAD_L} y1={scaleRSIY(50)} x2={PAD_L + plotW} y2={scaleRSIY(50)}
                stroke="#e5e7eb" strokeWidth="0.5"
              />
              <text x={PAD_L + plotW + 2} y={scaleRSIY(50) + 3} fontSize="7" fill="#9ca3af">50</text>
            </>
          )}

          {/* Highlight overbought periods */}
          {obZones.map((z, i) => (
            <rect
              key={`ob-${i}`}
              x={scaleX(z.start)}
              y={PAD_T + H_PRICE + GAP}
              width={scaleX(z.end) - scaleX(z.start)}
              height={H_RSI}
              fill="rgba(239,68,68,0.08)"
            />
          ))}

          {/* Highlight oversold periods */}
          {osZones.map((z, i) => (
            <rect
              key={`os-${i}`}
              x={scaleX(z.start)}
              y={PAD_T + H_PRICE + GAP}
              width={scaleX(z.end) - scaleX(z.start)}
              height={H_RSI}
              fill="rgba(16,185,129,0.08)"
            />
          ))}

          {/* RSI line */}
          <path d={rsiPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* RSI dots */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={scaleX(i)}
              cy={scaleRSIY(d.rsi)}
              r="2"
              fill={d.rsi >= 70 ? "#ef4444" : d.rsi <= 30 ? "#10b981" : "#f59e0b"}
            />
          ))}

          {/* Divergence arrows */}
          {mode === "divergence" && divergenceType === "bullish" && (
            <>
              {/* Price lower low arrow */}
              <line x1={scaleX(4)} y1={scalePriceY(94) + 4} x2={scaleX(10)} y2={scalePriceY(92) + 4} stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrowDown)" />
              <text x={(scaleX(4) + scaleX(10)) / 2} y={scalePriceY(91) + 16} textAnchor="middle" fontSize="7" fill="#dc2626" fontWeight="600">Lower Low</text>

              {/* RSI higher low arrow */}
              <line x1={scaleX(4)} y1={scaleRSIY(28) + 4} x2={scaleX(10)} y2={scaleRSIY(32) - 4} stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrowUp)" />
              <text x={(scaleX(4) + scaleX(10)) / 2} y={scaleRSIY(25)} textAnchor="middle" fontSize="7" fill="#059669" fontWeight="600">Higher Low</text>

              <defs>
                <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6" fill="none" stroke="#ef4444" strokeWidth="1" />
                </marker>
                <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6" fill="none" stroke="#10b981" strokeWidth="1" />
                </marker>
              </defs>

              {/* Bullish divergence label */}
              <rect x={scaleX(6) - 35} y={scaleRSIY(50) - 10} width={70} height={16} rx="4" fill="#dcfce7" stroke="#86efac" strokeWidth="0.5" />
              <text x={scaleX(6)} y={scaleRSIY(50) + 2} textAnchor="middle" fontSize="8" fill="#059669" fontWeight="700">
                Bullish Divergence
              </text>
            </>
          )}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500 dark:text-text-subtle">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Overbought (70+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Oversold (30-)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Neutral
        </span>
      </div>
    </div>
  );
}
