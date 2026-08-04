"use client";

import { useMemo, useRef, useState } from "react";
import { genSRSeries } from "./chartMath";

interface LevelFinderProps {
  mode?: "support" | "resistance";
  difficulty?: 1 | 2 | 3;
  seed?: number;
}

const W = 360;
const H = 240;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 20;
const PAD_B = 28;
const plotW = W - PAD_L - PAD_R;
const plotH = H - PAD_T - PAD_B;

export default function LevelFinder({
  mode = "support",
  difficulty = 1,
  seed = 1,
}: LevelFinderProps) {
  const [chartSeed, setChartSeed] = useState(seed);
  const series = useMemo(
    () => genSRSeries(chartSeed, mode, difficulty),
    [chartSeed, mode, difficulty],
  );

  const { candles, level, zone, touches, minPrice, maxPrice } = series;
  const priceRange = maxPrice - minPrice;

  const scaleX = (i: number) => PAD_L + (i / (candles.length - 1)) * plotW;
  const scaleY = (price: number) => PAD_T + plotH - ((price - minPrice) / priceRange) * plotH;
  const yToPrice = (y: number) => minPrice + ((PAD_T + plotH - y) / plotH) * priceRange;
  const barW = (plotW / candles.length) * 0.6;

  // User's guessed line, in price units. Start in the middle of the plot.
  const [guess, setGuess] = useState<number>(() => minPrice + priceRange * 0.5);
  const [dragging, setDragging] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const [reveal, setReveal] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const isCorrect = guess >= zone.low && guess <= zone.high;
  const distance = isCorrect
    ? 0
    : guess < zone.low
      ? zone.low - guess
      : guess - zone.high;

  function pointerToPrice(clientY: number): number {
    const svg = svgRef.current;
    if (!svg) return guess;
    const rect = svg.getBoundingClientRect();
    const yInView = ((clientY - rect.top) / rect.height) * H;
    const clampedY = Math.max(PAD_T, Math.min(PAD_T + plotH, yInView));
    return yToPrice(clampedY);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (checked && isCorrect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setChecked(false);
    setGuess(pointerToPrice(e.clientY));
  }
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    setGuess(pointerToPrice(e.clientY));
  }
  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (dragging) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  function handleCheck() {
    setChecked(true);
    const next = attempts + 1;
    setAttempts(next);
    if (!isCorrect && next >= 2) setReveal(true);
  }

  function newChart() {
    setChartSeed((s) => s + 1);
    setGuess(minPrice + priceRange * 0.5);
    setChecked(false);
    setReveal(false);
    setAttempts(0);
    setDragging(false);
  }

  function retry() {
    setChecked(false);
  }

  const label = mode === "support" ? "Support" : "Resistance";
  const accent = mode === "support" ? "#10b981" : "#ef4444";
  const guessY = scaleY(guess);
  const showZone = reveal || (checked && isCorrect);

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-2xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">
          Find the {label}
        </h3>
        <button
          onClick={newChart}
          className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted hover:bg-gray-200 dark:hover:bg-surface-sunken transition-colors"
        >
          New chart
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-text-subtle mb-2">
        Drag the dashed line to where you think {label.toLowerCase()} sits, then Check.
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none cursor-ns-resize"
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Answer zone (revealed on success or after 2 misses) */}
        {showZone && (
          <g>
            <rect
              x={PAD_L}
              y={scaleY(zone.high)}
              width={plotW}
              height={Math.max(2, scaleY(zone.low) - scaleY(zone.high))}
              fill={mode === "support" ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.14)"}
              rx="2"
            />
            <line
              x1={PAD_L}
              y1={scaleY(level)}
              x2={PAD_L + plotW}
              y2={scaleY(level)}
              stroke={accent}
              strokeWidth="1.5"
              strokeDasharray="6,3"
            />
            {touches.map((ti) => (
              <circle
                key={ti}
                cx={scaleX(ti)}
                cy={scaleY(mode === "support" ? candles[ti].low : candles[ti].high)}
                r="4"
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
              />
            ))}
          </g>
        )}

        {/* Candlesticks */}
        {candles.map((d, i) => {
          const x = scaleX(i);
          const isUp = d.close >= d.open;
          const bodyTop = scaleY(Math.max(d.open, d.close));
          const bodyBot = scaleY(Math.min(d.open, d.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={x} y1={scaleY(d.high)} x2={x} y2={scaleY(d.low)} stroke={isUp ? "#16a34a" : "#dc2626"} strokeWidth="1" />
              <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} fill={isUp ? "#16a34a" : "#dc2626"} rx="0.5" />
            </g>
          );
        })}

        {/* User's draggable line */}
        <g>
          <line
            x1={PAD_L}
            y1={guessY}
            x2={PAD_L + plotW}
            y2={guessY}
            stroke={checked ? (isCorrect ? "#10b981" : "#f59e0b") : "#3b82f6"}
            strokeWidth="2"
            strokeDasharray="5,4"
          />
          <circle cx={PAD_L + plotW} cy={guessY} r={dragging ? 7 : 5} fill={checked ? (isCorrect ? "#10b981" : "#f59e0b") : "#3b82f6"} stroke="white" strokeWidth="1.5" />
          <text x={PAD_L + 3} y={guessY - 4} fontSize="9" fill={checked ? (isCorrect ? "var(--gain)" : "#d97706") : "#3b82f6"} fontWeight="700">
            ${guess.toFixed(1)}
          </text>
        </g>

        {/* Y-axis labels */}
        {Array.from({ length: 5 }, (_, i) => {
          const price = minPrice + (i / 4) * priceRange;
          return (
            <text key={i} x={PAD_L - 4} y={scaleY(price) + 3} textAnchor="end" fontSize="8" fill="var(--text-faint)">
              ${Math.round(price)}
            </text>
          );
        })}
      </svg>

      {/* Feedback */}
      {checked ? (
        isCorrect ? (
          <div className="mt-2 bg-green-50 dark:bg-gain-bg border border-green-200 dark:border-gain-border rounded-lg p-3 text-sm text-green-800 dark:text-gain-strong">
            <span className="font-semibold">Nailed it.</span> Price tagged this zone {touches.length} times
            {mode === "support" ? " and bounced each time" : " and got rejected each time"} — those repeated
            swing {mode === "support" ? "lows" : "highs"} are what make it real {label.toLowerCase()}. The more
            touches, the stronger the level.
          </div>
        ) : (
          <div className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Off by ${distance.toFixed(1)}.</span>{" "}
            {reveal
              ? `The zone is shown above — notice the ${touches.length} circled ${mode === "support" ? "lows" : "highs"} clustered together. That cluster is the level.`
              : `Look for the price where the ${mode === "support" ? "lows" : "highs"} line up more than once. Drag ${guess < zone.low ? "up" : "down"} and check again.`}
          </div>
        )
      ) : (
        <p className="text-center text-[10px] text-gray-400 dark:text-text-faint mt-1">
          Attempt {attempts + 1}
        </p>
      )}

      <div className="flex gap-2 mt-2">
        {checked && !isCorrect ? (
          <button
            onClick={retry}
            className="flex-1 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors text-sm"
          >
            Try again
          </button>
        ) : !checked ? (
          <button
            onClick={handleCheck}
            className="flex-1 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors text-sm"
          >
            Check
          </button>
        ) : (
          <button
            onClick={newChart}
            className="flex-1 py-2.5 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 active:bg-emerald-700 transition-colors text-sm"
          >
            Next chart
          </button>
        )}
      </div>
    </div>
  );
}
