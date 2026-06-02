"use client";

import { useState, useMemo } from "react";

type Tab = "squeeze" | "breakout" | "bounce";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BollingerBandsChart(_props: Record<string, unknown>) {
  const [activeTab, setActiveTab] = useState<Tab>("squeeze");

  const W = 360;
  const H = 250;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // ── Generate SPY-like price data (~440 base) ─────────────────────────────
  const rawPrices = useMemo(() => {
    const pts: number[] = [];
    let p = 440;
    for (let i = 0; i < 100; i++) {
      let drift: number;
      let noiseScale: number;

      if (i < 20) {
        // Normal range-bound movement
        drift = Math.sin(i * 0.5) * 0.3;
        noiseScale = 1.2;
      } else if (i < 35) {
        // Squeeze: compression, bands narrow
        drift = Math.sin(i * 0.8) * 0.15;
        noiseScale = 0.4;
      } else if (i < 45) {
        // Post-squeeze breakout: price bursts above upper band
        drift = 0.55 + Math.sin(i * 0.4) * 0.1;
        noiseScale = 0.9;
      } else if (i < 60) {
        // Pullback after breakout
        drift = -0.3 + Math.sin(i * 0.5) * 0.15;
        noiseScale = 1.0;
      } else if (i < 72) {
        // Decline toward lower band
        drift = -0.45 + Math.sin(i * 0.3) * 0.1;
        noiseScale = 0.9;
      } else if (i < 82) {
        // Lower band bounce: price touches and reverses
        drift = 0.40 + Math.sin(i * 0.6) * 0.1;
        noiseScale = 0.8;
      } else {
        // Recovery
        drift = 0.2 + Math.sin(i * 0.4) * 0.15;
        noiseScale = 1.0;
      }

      const noise = (Math.random() - 0.48) * noiseScale;
      p = Math.max(420, Math.min(470, p + drift + noise));
      pts.push(p);
    }
    return pts;
  }, []);

  // ── Bollinger Bands calculation ─────────────────────────────────────────
  const PERIOD = 20;
  const MULT = 2;

  const bands = useMemo(() => {
    return rawPrices.map((_, i) => {
      const slice = rawPrices.slice(Math.max(0, i - PERIOD + 1), i + 1);
      const sma = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / slice.length;
      const std = Math.sqrt(variance);
      return { sma, upper: sma + MULT * std, lower: sma - MULT * std, bw: std * 2 };
    });
  }, [rawPrices]);

  // ── Scale helpers ────────────────────────────────────────────────────────
  const allPrices = [
    ...rawPrices,
    ...bands.map((b) => b.upper),
    ...bands.map((b) => b.lower),
  ];
  const priceMin = Math.min(...allPrices) - 1;
  const priceMax = Math.max(...allPrices) + 1;
  const priceRange = priceMax - priceMin;

  const sx = (i: number) => PAD_L + (i / (rawPrices.length - 1)) * plotW;
  const sy = (p: number) => PAD_T + plotH - ((p - priceMin) / priceRange) * plotH;

  // ── SVG paths ───────────────────────────────────────────────────────────
  const pricePath = rawPrices.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(p).toFixed(1)}`).join(" ");
  const smaPath = bands.map((b, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(b.sma).toFixed(1)}`).join(" ");
  const upperPath = bands.map((b, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(b.upper).toFixed(1)}`).join(" ");
  const lowerPath = bands.map((b, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(b.lower).toFixed(1)}`).join(" ");

  // Shaded area between upper and lower bands
  const bandAreaPath =
    bands.map((b, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(b.upper).toFixed(1)}`).join(" ") +
    " " +
    bands
      .slice()
      .reverse()
      .map((b, ri) => `L${sx(rawPrices.length - 1 - ri).toFixed(1)},${sy(b.lower).toFixed(1)}`)
      .join(" ") +
    " Z";

  // ── Highlight regions per tab ───────────────────────────────────────────
  // Squeeze: bands narrow (low bandwidth) around index 22-35
  const squeezeStart = 22;
  const squeezeEnd = 35;

  // Breakout: price above upper band around index 37-44
  const breakoutIdx = rawPrices.findIndex((p, i) => i > 35 && i < 50 && p > bands[i].upper);

  // Bounce: price touches lower band around index 68-74
  const bounceIdx = rawPrices.findIndex((p, i) => i > 60 && i < 80 && p < bands[i].lower + 1.5);

  // ── Y-axis labels ────────────────────────────────────────────────────────
  const yTicks = [priceMin + 1, (priceMin + priceMax) / 2, priceMax - 1];

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Bollinger Bands — SPY</h3>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-text-subtle">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-400 border-dashed inline-block" />
            Bands
          </span>
          <span className="flex items-center gap-1 ml-1">
            <span className="w-3 h-0.5 bg-white dark:bg-surface-elevated border border-gray-400 inline-block" />
            Price
          </span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 mb-3">
        {(["squeeze", "breakout", "bounce"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
              activeTab === tab
                ? tab === "squeeze"
                  ? "bg-yellow-400 text-yellow-900"
                  : tab === "breakout"
                  ? "bg-emerald-500 text-white"
                  : "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Band fill */}
        <path d={bandAreaPath} fill="rgba(59,130,246,0.08)" />

        {/* ── Squeeze highlight ─────────────────────────────────────────── */}
        {activeTab === "squeeze" && (
          <>
            <rect
              x={sx(squeezeStart)}
              y={PAD_T}
              width={sx(squeezeEnd) - sx(squeezeStart)}
              height={plotH}
              fill="rgba(234,179,8,0.12)"
              stroke="#eab308"
              strokeWidth="0.8"
              strokeDasharray="3,3"
            />
            <text
              x={(sx(squeezeStart) + sx(squeezeEnd)) / 2}
              y={PAD_T + 12}
              textAnchor="middle"
              fontSize="7.5"
              fill="#a16207"
              fontWeight="700"
            >
              Squeeze
            </text>
            <text
              x={(sx(squeezeStart) + sx(squeezeEnd)) / 2}
              y={PAD_T + 22}
              textAnchor="middle"
              fontSize="6.5"
              fill="#a16207"
            >
              bands narrow
            </text>
          </>
        )}

        {/* ── Breakout highlight ────────────────────────────────────────── */}
        {activeTab === "breakout" && breakoutIdx > 0 && (
          <>
            {/* Arrow pointing up from price at breakout */}
            <line
              x1={sx(breakoutIdx)}
              y1={sy(rawPrices[breakoutIdx]) - 4}
              x2={sx(breakoutIdx)}
              y2={sy(rawPrices[breakoutIdx]) - 18}
              stroke="#059669"
              strokeWidth="2"
            />
            <polygon
              points={`${sx(breakoutIdx)},${sy(rawPrices[breakoutIdx]) - 22} ${sx(breakoutIdx) - 4},${sy(rawPrices[breakoutIdx]) - 14} ${sx(breakoutIdx) + 4},${sy(rawPrices[breakoutIdx]) - 14}`}
              fill="#059669"
            />
            {/* Label box */}
            {(() => {
              const boxW = 96;
              const boxH = 26;
              const bx = Math.min(Math.max(sx(breakoutIdx) - boxW / 2, PAD_L), PAD_L + plotW - boxW);
              const by = sy(rawPrices[breakoutIdx]) - 52;
              return (
                <>
                  <rect x={bx} y={by} width={boxW} height={boxH} rx="4" fill="rgba(220,252,231,0.95)" stroke="#86efac" strokeWidth="0.8" />
                  <text x={bx + boxW / 2} y={by + 9} textAnchor="middle" fontSize="7" fill="#059669" fontWeight="700">Upper band touch</text>
                  <text x={bx + boxW / 2} y={by + 20} textAnchor="middle" fontSize="6.5" fill="#047857">overbought OR strong trend</text>
                </>
              );
            })()}
          </>
        )}

        {/* ── Bounce highlight ─────────────────────────────────────────── */}
        {activeTab === "bounce" && bounceIdx > 0 && (
          <>
            {/* Arrow pointing up from lower band touch */}
            <line
              x1={sx(bounceIdx)}
              y1={sy(rawPrices[bounceIdx]) + 4}
              x2={sx(bounceIdx)}
              y2={sy(rawPrices[bounceIdx]) + 18}
              stroke="#2563eb"
              strokeWidth="2"
            />
            <polygon
              points={`${sx(bounceIdx)},${sy(rawPrices[bounceIdx]) + 22} ${sx(bounceIdx) - 4},${sy(rawPrices[bounceIdx]) + 14} ${sx(bounceIdx) + 4},${sy(rawPrices[bounceIdx]) + 14}`}
              fill="#2563eb"
            />
            {(() => {
              const boxW = 90;
              const boxH = 26;
              const bx = Math.min(Math.max(sx(bounceIdx) - boxW / 2, PAD_L), PAD_L + plotW - boxW);
              const by = sy(rawPrices[bounceIdx]) + 26;
              return (
                <>
                  <rect x={bx} y={by} width={boxW} height={boxH} rx="4" fill="rgba(219,234,254,0.95)" stroke="#93c5fd" strokeWidth="0.8" />
                  <text x={bx + boxW / 2} y={by + 9} textAnchor="middle" fontSize="7" fill="#1d4ed8" fontWeight="700">Lower band touch</text>
                  <text x={bx + boxW / 2} y={by + 20} textAnchor="middle" fontSize="6.5" fill="#1e40af">oversold signal → bounce</text>
                </>
              );
            })()}
          </>
        )}

        {/* Upper band */}
        <path d={upperPath} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,3" />
        {/* Middle band (SMA20) */}
        <path d={smaPath} fill="none" stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,3" />
        {/* Lower band */}
        <path d={lowerPath} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,3" />
        {/* Price line */}
        <path d={pricePath} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.5))" }}
        />
        {/* Price line overlay (visible on white bg) */}
        <path d={pricePath} fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Y-axis ticks */}
        {yTicks.map((p) => (
          <text key={p} x={PAD_L - 4} y={sy(p) + 3} textAnchor="end" fontSize="7" fill="#9ca3af">
            ${Math.round(p)}
          </text>
        ))}

        {/* Band labels at right edge */}
        <text x={PAD_L + plotW + 2} y={sy(bands[99].upper) + 3} fontSize="6.5" fill="#60a5fa">UB</text>
        <text x={PAD_L + plotW + 2} y={sy(bands[99].sma) + 3} fontSize="6.5" fill="#9ca3af">MA</text>
        <text x={PAD_L + plotW + 2} y={sy(bands[99].lower) + 3} fontSize="6.5" fill="#60a5fa">LB</text>
      </svg>

      {/* Key insight panel */}
      <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-100 dark:border-border-subtle">
        <p className="text-[10px] font-bold text-gray-700 dark:text-text-muted mb-2 uppercase tracking-wide">Options Strategy Connection</p>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-red-500 dark:text-loss font-bold text-xs shrink-0">Wide</span>
            <p className="text-[10px] text-gray-600 dark:text-text-muted leading-snug">
              High IV = Wide bands = Options are <span className="font-semibold text-red-600 dark:text-loss">expensive</span> →
              better to <span className="font-semibold text-red-600 dark:text-loss">SELL</span> options (covered calls, cash-secured puts)
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold text-xs shrink-0">Squeeze</span>
            <p className="text-[10px] text-gray-600 dark:text-text-muted leading-snug">
              Low IV = Narrow bands = Options are <span className="font-semibold text-emerald-600 dark:text-gain">cheap</span> →
              better to <span className="font-semibold text-emerald-600 dark:text-gain">BUY</span> options (calls/puts before the breakout)
            </p>
          </div>
        </div>
      </div>

      {/* Tab-specific annotation */}
      <div className="mt-2 text-center text-[10px] text-gray-400 dark:text-text-faint">
        {activeTab === "squeeze" && "Volatility compression → breakout coming. Buy cheap options now."}
        {activeTab === "breakout" && "Upper band touch → overbought signal OR start of strong trend."}
        {activeTab === "bounce" && "Lower band touch → oversold signal. Watch for reversal candle."}
      </div>
    </div>
  );
}
