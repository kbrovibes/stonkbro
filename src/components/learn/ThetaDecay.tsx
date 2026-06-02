"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import InteractiveSlider from "./InteractiveSlider";

type Moneyness = "OTM" | "ATM" | "ITM";

function optionValue(daysLeft: number, moneyness: Moneyness): number {
  const t = daysLeft / 365;
  const intrinsic = moneyness === "ITM" ? 5 : 0;
  const base = moneyness === "ATM" ? 1.0 : moneyness === "ITM" ? 0.7 : 0.5;
  const timeValue = base * 10 * Math.sqrt(t);
  return intrinsic + Math.max(0, timeValue);
}

export default function ThetaDecay() {
  const [moneyness, setMoneyness] = useState<Moneyness>("ATM");
  const [playing, setPlaying] = useState(false);
  const [animDte, setAnimDte] = useState(90);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const W = 340;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 40;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const maxVal = optionValue(90, "ATM") * 1.1;

  const points = useMemo(() => {
    const pts: { x: number; y: number; dte: number; val: number }[] = [];
    for (let d = 90; d >= 0; d--) {
      const val = optionValue(d, moneyness);
      const x = PAD_L + ((90 - d) / 90) * plotW;
      const y = PAD_T + plotH - (val / maxVal) * plotH;
      pts.push({ x, y, dte: d, val });
    }
    return pts;
  }, [moneyness, maxVal]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Sweet spot zone (30-45 DTE)
  const sweetX1 = PAD_L + ((90 - 45) / 90) * plotW;
  const sweetX2 = PAD_L + ((90 - 30) / 90) * plotW;

  // Animated marker
  const animX = PAD_L + ((90 - animDte) / 90) * plotW;
  const animVal = optionValue(animDte, moneyness);
  const animY = PAD_T + plotH - (animVal / maxVal) * plotH;

  // Daily theta at current point
  const thetaToday = animDte > 0 ? optionValue(animDte, moneyness) - optionValue(animDte - 1, moneyness) : 0;

  const animate = useCallback(() => {
    const now = performance.now();
    if (now - lastTimeRef.current > 50) {
      lastTimeRef.current = now;
      setAnimDte((d) => {
        if (d <= 0) {
          setPlaying(false);
          return 0;
        }
        return d - 1;
      });
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, animate]);

  function togglePlay() {
    if (animDte <= 0) setAnimDte(90);
    setPlaying((p) => !p);
  }

  const moneynessOptions: Moneyness[] = ["OTM", "ATM", "ITM"];

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Theta Decay Over Time</h3>
        <button
          onClick={togglePlay}
          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong hover:bg-emerald-100 transition-colors"
        >
          {playing ? "Pause" : animDte <= 0 ? "Replay" : "Play"}
        </button>
      </div>

      {/* Daily theta */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 dark:text-text-subtle">Daily decay at {animDte} DTE: </span>
        <span className="text-sm font-bold text-emerald-600 dark:text-gain">
          ${Math.abs(thetaToday).toFixed(2)}/day
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Sweet spot zone */}
        <rect
          x={sweetX1}
          y={PAD_T}
          width={sweetX2 - sweetX1}
          height={plotH}
          fill="rgba(16,185,129,0.08)"
          rx="2"
        />
        <text
          x={(sweetX1 + sweetX2) / 2}
          y={PAD_T + 12}
          textAnchor="middle"
          fontSize="7"
          fill="var(--gain)"
          fontWeight="600"
        >
          Sweet Spot
        </text>

        {/* X-axis labels: days to expiry (right to left) */}
        {[90, 60, 45, 30, 14, 0].map((d) => {
          const x = PAD_L + ((90 - d) / 90) * plotW;
          return (
            <g key={d}>
              <line x1={x} y1={PAD_T + plotH} x2={x} y2={PAD_T + plotH + 4} stroke="var(--border-strong)" strokeWidth="0.5" />
              <text x={x} y={H - 10} textAnchor="middle" fontSize="8" fill="var(--text-faint)">
                {d}d
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="var(--border)" strokeWidth="0.5" />
        <text x={PAD_L - 4} y={PAD_T + plotH + 3} textAnchor="end" fontSize="8" fill="var(--text-faint)">$0</text>

        {/* X-axis label */}
        <text x={PAD_L + plotW / 2} y={H - 1} textAnchor="middle" fontSize="8" fill="var(--text-subtle)">
          Days to Expiration
        </text>

        {/* Decay curve fill */}
        <path
          d={`${pathD} L${PAD_L + plotW},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`}
          fill="rgba(16,185,129,0.06)"
        />

        {/* Decay curve */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--gain)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Animated marker */}
        <circle cx={animX} cy={animY} r="4" fill="var(--gain)" stroke="white" strokeWidth="2" />
        <text x={animX + 8} y={animY - 6} fontSize="9" fill="var(--gain)" fontWeight="bold">
          ${animVal.toFixed(2)}
        </text>
      </svg>

      <div className="mt-3 flex gap-1">
        {moneynessOptions.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMoneyness(m);
              setAnimDte(90);
              setPlaying(false);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              moneyness === m
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted hover:bg-gray-200"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
