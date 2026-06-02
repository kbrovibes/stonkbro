"use client";

import { useState, useMemo } from "react";

interface CandlestickChartProps {
  mode?: "anatomy" | "single-patterns" | "multi-patterns" | "context";
  showLabels?: boolean;
  patterns?: string[];
  showSupportResistance?: boolean;
  showRSI?: boolean;
}

type Candle = { open: number; high: number; low: number; close: number; label?: string };

function getCandleData(mode: string): Candle[] {
  if (mode === "anatomy") {
    return [
      { open: 100, high: 106, low: 98, close: 104 },
    ];
  }

  if (mode === "single-patterns") {
    return [
      // Doji
      { open: 100, high: 103, low: 97, close: 100.2, label: "Doji" },
      // Spacer
      { open: 102, high: 104, low: 100, close: 103 },
      // Hammer
      { open: 101, high: 102, low: 95, close: 101.5, label: "Hammer" },
      // Spacer
      { open: 100, high: 102, low: 99, close: 101 },
      // Bearish engulfing (2 candles)
      { open: 99, high: 102, low: 98.5, close: 101.5, label: "Engulf (1)" },
      { open: 102, high: 102.5, low: 96, close: 97, label: "Engulf (2)" },
    ];
  }

  if (mode === "multi-patterns") {
    // Morning star pattern
    return [
      { open: 105, high: 106, low: 100, close: 101 },
      { open: 104, high: 105, low: 100, close: 101, label: "Selling" },
      { open: 101, high: 101.5, low: 98, close: 98.5, label: "Big Red" },
      { open: 98, high: 99, low: 97, close: 98.5, label: "Indecision" },
      { open: 98, high: 103, low: 97.5, close: 102.5, label: "Buyers!" },
      { open: 102, high: 105, low: 101.5, close: 104.5, label: "Confirm" },
      { open: 104, high: 106.5, low: 103.5, close: 106 },
      { open: 106, high: 108, low: 105, close: 107.5 },
      // Three white soldiers
      { open: 107, high: 109, low: 106.5, close: 108.5, label: "Soldier 1" },
      { open: 108, high: 110.5, low: 107.5, close: 110, label: "Soldier 2" },
      { open: 109.5, high: 112, low: 109, close: 111.5, label: "Soldier 3" },
    ];
  }

  // Context mode - candles at support with RSI oversold
  return [
    { open: 108, high: 109, low: 106, close: 107 },
    { open: 107, high: 108, low: 104, close: 105 },
    { open: 105, high: 106, low: 102, close: 103 },
    { open: 103, high: 104, low: 100, close: 101 },
    { open: 101, high: 102, low: 97, close: 98 },
    { open: 98, high: 99, low: 95, close: 96 },
    { open: 96, high: 97, low: 93, close: 94 },
    { open: 94, high: 94.5, low: 91, close: 93.5, label: "Hammer at Support" },
    { open: 93, high: 97, low: 92.5, close: 96.5, label: "Bounce!" },
    { open: 96, high: 99, low: 95.5, close: 98.5 },
    { open: 98, high: 101, low: 97.5, close: 100.5 },
    { open: 100, high: 103, low: 99.5, close: 102 },
  ];
}

export default function CandlestickChart({
  mode = "anatomy",
  showLabels = false,
  showSupportResistance = false,
  showRSI = false,
}: CandlestickChartProps) {
  const [selectedCandle, setSelectedCandle] = useState<number | null>(null);

  const W = 360;
  const H_CHART = mode === "anatomy" ? 200 : 180;
  const H_RSI_PANEL = showRSI ? 60 : 0;
  const H = H_CHART + H_RSI_PANEL + 40;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = mode === "anatomy" ? 40 : 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H_CHART - PAD_T;

  const data = useMemo(() => getCandleData(mode), [mode]);

  const allPrices = data.flatMap((d) => [d.high, d.low]);
  const minPrice = Math.min(...allPrices) - 2;
  const maxPrice = Math.max(...allPrices) + 2;
  const priceRange = maxPrice - minPrice;

  const barSpacing = plotW / (data.length + 1);
  const barW = Math.min(barSpacing * 0.6, mode === "anatomy" ? 60 : 20);

  const scaleX = (i: number) => PAD_L + (i + 1) * barSpacing;
  const scaleY = (price: number) => PAD_T + plotH - ((price - minPrice) / priceRange) * plotH;

  // Context mode RSI data
  const rsiData = mode === "context" ? [55, 48, 40, 35, 30, 26, 22, 20, 28, 38, 48, 55] : [];
  const rsiTop = H_CHART + 10;
  const scaleRSIY = (r: number) => rsiTop + H_RSI_PANEL - (r / 100) * H_RSI_PANEL;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">
          {mode === "anatomy"
            ? "Candlestick Anatomy"
            : mode === "single-patterns"
              ? "Key Single-Candle Patterns"
              : mode === "multi-patterns"
                ? "Multi-Candle Patterns"
                : "Candles in Context"
          }
        </h3>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Support line for context mode */}
        {showSupportResistance && mode === "context" && (
          <g>
            <rect x={PAD_L} y={scaleY(93) - 4} width={plotW} height={8} fill="rgba(16,185,129,0.1)" rx="2" />
            <line x1={PAD_L} y1={scaleY(93)} x2={PAD_L + plotW} y2={scaleY(93)} stroke="#10b981" strokeWidth="1.5" strokeDasharray="6,3" />
            <text x={PAD_L + 4} y={scaleY(93) + 14} fontSize="8" fill="#059669" fontWeight="600">Support $93</text>
          </g>
        )}

        {/* Candlesticks */}
        {data.map((d, i) => {
          const x = scaleX(i);
          const isUp = d.close >= d.open;
          const bodyTop = scaleY(Math.max(d.open, d.close));
          const bodyBot = scaleY(Math.min(d.open, d.close));
          const bodyH = Math.max(1.5, bodyBot - bodyTop);
          const isSelected = selectedCandle === i;
          const fillColor = isUp ? "#16a34a" : "#dc2626";
          const strokeColor = isUp ? "#15803d" : "#b91c1c";

          return (
            <g key={i} onClick={() => setSelectedCandle(isSelected ? null : i)} className="cursor-pointer">
              {/* Selection highlight */}
              {isSelected && (
                <rect
                  x={x - barW / 2 - 4}
                  y={scaleY(d.high) - 4}
                  width={barW + 8}
                  height={scaleY(d.low) - scaleY(d.high) + 8}
                  fill="rgba(59,130,246,0.08)"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  rx="3"
                />
              )}

              {/* Upper wick */}
              <line
                x1={x} y1={scaleY(d.high)} x2={x} y2={bodyTop}
                stroke={strokeColor} strokeWidth={mode === "anatomy" ? "2" : "1"}
              />
              {/* Lower wick */}
              <line
                x1={x} y1={bodyBot} x2={x} y2={scaleY(d.low)}
                stroke={strokeColor} strokeWidth={mode === "anatomy" ? "2" : "1"}
              />
              {/* Body */}
              <rect
                x={x - barW / 2} y={bodyTop} width={barW} height={bodyH}
                fill={fillColor} stroke={strokeColor} strokeWidth="0.5" rx="1"
              />

              {/* Anatomy labels for anatomy mode */}
              {mode === "anatomy" && (
                <>
                  {/* High label */}
                  <line x1={x + barW / 2 + 4} y1={scaleY(d.high)} x2={x + barW / 2 + 30} y2={scaleY(d.high)} stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2,2" />
                  <text x={x + barW / 2 + 32} y={scaleY(d.high) + 3} fontSize="10" fill="#374151" fontWeight="600">
                    High ${d.high}
                  </text>

                  {/* Close label */}
                  <line x1={x + barW / 2 + 4} y1={scaleY(d.close)} x2={x + barW / 2 + 30} y2={scaleY(d.close)} stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2,2" />
                  <text x={x + barW / 2 + 32} y={scaleY(d.close) + 3} fontSize="10" fill="#16a34a" fontWeight="600">
                    Close ${d.close}
                  </text>

                  {/* Open label */}
                  <line x1={x - barW / 2 - 4} y1={scaleY(d.open)} x2={x - barW / 2 - 30} y2={scaleY(d.open)} stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2,2" />
                  <text x={x - barW / 2 - 32} y={scaleY(d.open) + 3} fontSize="10" fill="#374151" fontWeight="600" textAnchor="end">
                    Open ${d.open}
                  </text>

                  {/* Low label */}
                  <line x1={x - barW / 2 - 4} y1={scaleY(d.low)} x2={x - barW / 2 - 30} y2={scaleY(d.low)} stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2,2" />
                  <text x={x - barW / 2 - 32} y={scaleY(d.low) + 3} fontSize="10" fill="#374151" fontWeight="600" textAnchor="end">
                    Low ${d.low}
                  </text>

                  {/* Upper wick label */}
                  <text x={x + barW / 2 + 10} y={scaleY((d.high + Math.max(d.open, d.close)) / 2) + 3} fontSize="8" fill="#9ca3af">
                    Upper Wick
                  </text>

                  {/* Lower wick label */}
                  <text x={x - barW / 2 - 10} y={scaleY((d.low + Math.min(d.open, d.close)) / 2) + 3} fontSize="8" fill="#9ca3af" textAnchor="end">
                    Lower Wick
                  </text>

                  {/* Body label */}
                  <text x={x} y={scaleY((d.open + d.close) / 2) + 3} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">
                    Body
                  </text>
                </>
              )}

              {/* Pattern labels */}
              {d.label && mode !== "anatomy" && (
                <text
                  x={x}
                  y={scaleY(d.high) - 8}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#6b7280"
                  fontWeight="600"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Morning star bracket for multi-patterns */}
        {mode === "multi-patterns" && (
          <>
            <rect x={scaleX(2) - 15} y={scaleY(maxPrice) - 6} width={scaleX(4) - scaleX(2) + 30} height={12} rx="4" fill="#dcfce7" stroke="#86efac" strokeWidth="0.5" />
            <text x={(scaleX(2) + scaleX(4)) / 2} y={scaleY(maxPrice) + 2} textAnchor="middle" fontSize="8" fill="#059669" fontWeight="700">
              Morning Star
            </text>
            <rect x={scaleX(8) - 15} y={scaleY(maxPrice) - 6} width={scaleX(10) - scaleX(8) + 30} height={12} rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="0.5" />
            <text x={(scaleX(8) + scaleX(10)) / 2} y={scaleY(maxPrice) + 2} textAnchor="middle" fontSize="8" fill="#2563eb" fontWeight="700">
              3 White Soldiers
            </text>
          </>
        )}

        {/* RSI panel for context mode */}
        {showRSI && rsiData.length > 0 && (
          <g>
            {/* RSI zones */}
            <rect x={PAD_L} y={scaleRSIY(100)} width={plotW} height={scaleRSIY(70) - scaleRSIY(100)} fill="rgba(239,68,68,0.05)" />
            <line x1={PAD_L} y1={scaleRSIY(70)} x2={PAD_L + plotW} y2={scaleRSIY(70)} stroke="#fca5a5" strokeWidth="0.5" strokeDasharray="3,3" />
            <rect x={PAD_L} y={scaleRSIY(30)} width={plotW} height={scaleRSIY(0) - scaleRSIY(30)} fill="rgba(16,185,129,0.05)" />
            <line x1={PAD_L} y1={scaleRSIY(30)} x2={PAD_L + plotW} y2={scaleRSIY(30)} stroke="#86efac" strokeWidth="0.5" strokeDasharray="3,3" />

            {/* RSI line */}
            <path
              d={rsiData.map((r, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleRSIY(r)}`).join(" ")}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* RSI label */}
            <text x={PAD_L - 4} y={rsiTop + 8} textAnchor="end" fontSize="7" fill="#6b7280" fontWeight="600">RSI</text>

            {/* Oversold callout */}
            <text x={scaleX(7)} y={scaleRSIY(rsiData[7]) + 12} textAnchor="middle" fontSize="7" fill="#059669" fontWeight="600">
              Oversold!
            </text>
          </g>
        )}

        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const price = minPrice + (i / 4) * priceRange;
          return (
            <text key={i} x={PAD_L - 4} y={scaleY(price) + 3} textAnchor="end" fontSize="7" fill="#9ca3af">
              ${Math.round(price)}
            </text>
          );
        })}
      </svg>

      {/* Selected candle info */}
      {selectedCandle !== null && data[selectedCandle] && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-gray-500 dark:text-text-subtle">Open</div>
              <div className="font-bold text-gray-900 dark:text-text">${data[selectedCandle].open}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-text-subtle">High</div>
              <div className="font-bold text-gray-900 dark:text-text">${data[selectedCandle].high}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-text-subtle">Low</div>
              <div className="font-bold text-gray-900 dark:text-text">${data[selectedCandle].low}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-text-subtle">Close</div>
              <div className={`font-bold ${data[selectedCandle].close >= data[selectedCandle].open ? "text-green-600 dark:text-gain" : "text-red-600 dark:text-loss"}`}>
                ${data[selectedCandle].close}
              </div>
            </div>
          </div>
          {data[selectedCandle].label && (
            <div className="text-center mt-1 text-gray-600 dark:text-text-muted font-semibold">{data[selectedCandle].label}</div>
          )}
        </div>
      )}

      {/* Tap instruction */}
      {mode !== "anatomy" && (
        <p className="text-center text-[10px] text-gray-400 dark:text-text-faint mt-2">Tap a candle for details</p>
      )}
    </div>
  );
}
