"use client";

import { useState, useMemo } from "react";

interface SupportResistanceChartProps {
  mode?: "basics" | "drawing" | "breakout";
  showBounces?: boolean;
  showTouches?: boolean;
  showRoleReversal?: boolean;
}

// Generate fake price data that bounces off support/resistance
function generatePriceData(mode: string): { x: number; open: number; high: number; low: number; close: number }[] {
  const data: { x: number; open: number; high: number; low: number; close: number }[] = [];
  const support = 92;
  const resistance = 108;

  if (mode === "breakout") {
    // Price approaches resistance, breaks out, retests
    const prices = [
      95, 98, 102, 106, 107, 105, 107, 108, 106, 108,
      107, 109, 112, 115, 113, 110, 108, 109, 111, 114,
      116, 118, 117, 119, 121, 120, 122, 124, 123, 125,
    ];
    prices.forEach((p, i) => {
      const volatility = 1.5 + Math.random() * 2;
      const isUp = p > (prices[i - 1] || p);
      data.push({
        x: i,
        open: isUp ? p - volatility * 0.3 : p + volatility * 0.3,
        high: p + volatility * (0.3 + Math.random() * 0.5),
        low: p - volatility * (0.3 + Math.random() * 0.5),
        close: p,
      });
    });
  } else {
    // Basics / drawing: price bounces between support and resistance
    const prices = [
      100, 103, 105, 107, 108, 107, 105, 102, 98, 95,
      93, 92, 93, 95, 98, 101, 104, 106, 108, 107,
      105, 101, 97, 94, 92, 93, 96, 99, 103, 106,
    ];
    prices.forEach((p, i) => {
      const volatility = 1 + Math.random() * 1.5;
      const isUp = p > (prices[i - 1] || p);
      data.push({
        x: i,
        open: isUp ? p - volatility * 0.3 : p + volatility * 0.3,
        high: p + volatility * (0.3 + Math.random() * 0.4),
        low: p - volatility * (0.3 + Math.random() * 0.4),
        close: p,
      });
    });
  }
  return data;
}

export default function SupportResistanceChart({
  mode = "basics",
  showBounces = false,
  showTouches = false,
  showRoleReversal = false,
}: SupportResistanceChartProps) {
  const [activeLevel, setActiveLevel] = useState<"support" | "resistance" | null>(null);

  const W = 360;
  const H = 240;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 40;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const data = useMemo(() => generatePriceData(mode), [mode]);

  const allPrices = data.flatMap((d) => [d.high, d.low]);
  const minPrice = Math.min(...allPrices) - 2;
  const maxPrice = Math.max(...allPrices) + 2;
  const priceRange = maxPrice - minPrice;

  const barW = plotW / data.length * 0.6;

  const scaleX = (i: number) => PAD_L + (i / (data.length - 1)) * plotW;
  const scaleY = (price: number) => PAD_T + plotH - ((price - minPrice) / priceRange) * plotH;

  const supportLevel = mode === "breakout" ? 108 : 92;
  const resistanceLevel = mode === "breakout" ? 108 : 108;
  const supportY = scaleY(mode === "breakout" ? 108 : 92);
  const resistanceY = scaleY(108);

  // Find bounce points
  const bouncePoints = useMemo(() => {
    if (!showBounces && !showTouches) return [];
    const points: { x: number; y: number; type: "support" | "resistance" }[] = [];
    data.forEach((d, i) => {
      if (mode !== "breakout") {
        if (d.low <= 93) points.push({ x: scaleX(i), y: scaleY(d.low), type: "support" });
        if (d.high >= 107) points.push({ x: scaleX(i), y: scaleY(d.high), type: "resistance" });
      }
    });
    return points;
  }, [data, showBounces, showTouches, mode]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">
          {mode === "breakout" ? "Breakout & Role Reversal" : "Support & Resistance"}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveLevel(activeLevel === "support" ? null : "support")}
            className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
              activeLevel === "support" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Support
          </button>
          <button
            onClick={() => setActiveLevel(activeLevel === "resistance" ? null : "resistance")}
            className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
              activeLevel === "resistance" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Resistance
          </button>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Support line */}
        {mode !== "breakout" && (
          <g>
            <rect
              x={PAD_L}
              y={supportY - 4}
              width={plotW}
              height={8}
              fill={activeLevel === "support" ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)"}
              rx="2"
            />
            <line
              x1={PAD_L}
              y1={supportY}
              x2={PAD_L + plotW}
              y2={supportY}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="6,3"
            />
            <text x={PAD_L + 4} y={supportY + 14} fontSize="9" fill="#059669" fontWeight="600">
              Support $92
            </text>
          </g>
        )}

        {/* Resistance line */}
        <g>
          <rect
            x={PAD_L}
            y={resistanceY - 4}
            width={plotW}
            height={8}
            fill={activeLevel === "resistance" ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)"}
            rx="2"
          />
          <line
            x1={PAD_L}
            y1={resistanceY}
            x2={PAD_L + plotW}
            y2={resistanceY}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="6,3"
          />
          <text x={PAD_L + 4} y={resistanceY - 8} fontSize="9" fill="#dc2626" fontWeight="600">
            {mode === "breakout" ? "Old Resistance / New Support $108" : "Resistance $108"}
          </text>
        </g>

        {/* Candlesticks */}
        {data.map((d, i) => {
          const x = scaleX(i);
          const isUp = d.close >= d.open;
          const bodyTop = scaleY(Math.max(d.open, d.close));
          const bodyBot = scaleY(Math.min(d.open, d.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x}
                y1={scaleY(d.high)}
                x2={x}
                y2={scaleY(d.low)}
                stroke={isUp ? "#16a34a" : "#dc2626"}
                strokeWidth="1"
              />
              {/* Body */}
              <rect
                x={x - barW / 2}
                y={bodyTop}
                width={barW}
                height={bodyH}
                fill={isUp ? "#16a34a" : "#dc2626"}
                rx="0.5"
              />
            </g>
          );
        })}

        {/* Bounce markers */}
        {bouncePoints.map((p, i) => (
          <g key={`bounce-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="none"
              stroke={p.type === "support" ? "#10b981" : "#ef4444"}
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={p.type === "support" ? p.y + 14 : p.y - 8}
              textAnchor="middle"
              fontSize="7"
              fill={p.type === "support" ? "#059669" : "#dc2626"}
              fontWeight="600"
            >
              {p.type === "support" ? "Bounce" : "Reject"}
            </text>
          </g>
        ))}

        {/* Breakout arrow */}
        {mode === "breakout" && (
          <g>
            <text
              x={scaleX(12)}
              y={scaleY(113)}
              textAnchor="middle"
              fontSize="9"
              fill="#2563eb"
              fontWeight="700"
            >
              BREAKOUT
            </text>
            <text
              x={scaleX(18)}
              y={scaleY(109) + 14}
              textAnchor="middle"
              fontSize="8"
              fill="#059669"
              fontWeight="600"
            >
              Retest as Support
            </text>
          </g>
        )}

        {/* Y-axis price labels */}
        {[90, 95, 100, 105, 110, 115, 120, 125].filter(p => p >= minPrice && p <= maxPrice).map((price) => (
          <text
            key={price}
            x={PAD_L - 4}
            y={scaleY(price) + 3}
            textAnchor="end"
            fontSize="8"
            fill="#9ca3af"
          >
            ${price}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span> Support (floor)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500 inline-block"></span> Resistance (ceiling)
        </span>
      </div>
    </div>
  );
}
