"use client";

import { useMemo } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MACDChart(_props: Record<string, unknown>) {
  const W = 360;
  const H_PRICE = 180;
  const H_MACD = 120;
  const H_TOTAL = H_PRICE + H_MACD + 24;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 14;
  const GAP = 24;

  const plotW = W - PAD_L - PAD_R;

  // ── Generate AAPL-like price data ───────────────────────────────────────────
  const rawPrices = useMemo(() => {
    const pts: number[] = [];
    let p = 170;
    for (let i = 0; i < 100; i++) {
      // Bullish crossover setup ~pt 35-55, bearish ~pt 65-80
      let drift = 0.12;
      if (i < 35) drift = 0.05 + Math.sin(i * 0.3) * 0.08;
      else if (i < 55) drift = 0.30 + Math.sin(i * 0.5) * 0.1; // strong rally
      else if (i < 65) drift = 0.10;
      else if (i < 80) drift = -0.25 + Math.sin(i * 0.4) * 0.1; // pullback
      else drift = 0.15 + Math.sin(i * 0.3) * 0.08;

      const noise = (Math.random() - 0.48) * 0.9;
      p = Math.max(165, Math.min(200, p + drift + noise));
      pts.push(p);
    }
    return pts;
  }, []);

  // ── EMA helper ──────────────────────────────────────────────────────────────
  function calcEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = new Array(data.length).fill(0);
    ema[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  }

  const ema12 = useMemo(() => calcEMA(rawPrices, 12), [rawPrices]);
  const ema26 = useMemo(() => calcEMA(rawPrices, 26), [rawPrices]);
  const macdLine = useMemo(() => rawPrices.map((_, i) => ema12[i] - ema26[i]), [ema12, ema26]);
  const signalLine = useMemo(() => calcEMA(macdLine, 9), [macdLine]);
  const histogram = useMemo(() => macdLine.map((m, i) => m - signalLine[i]), [macdLine, signalLine]);

  // ── Scale helpers ───────────────────────────────────────────────────────────
  const priceMin = Math.min(...rawPrices) - 1;
  const priceMax = Math.max(...rawPrices) + 1;
  const priceRange = priceMax - priceMin;

  const macdAll = [...macdLine, ...signalLine];
  const macdMin = Math.min(...macdAll, ...histogram) - 0.1;
  const macdMax = Math.max(...macdAll, ...histogram) + 0.1;
  const macdRange = macdMax - macdMin;

  const plotHPrice = H_PRICE - PAD_T;
  const macdPanelTop = PAD_T + H_PRICE + GAP;
  const plotHMacd = H_MACD - 4;

  const sx = (i: number) => PAD_L + (i / (rawPrices.length - 1)) * plotW;
  const syPrice = (p: number) => PAD_T + plotHPrice - ((p - priceMin) / priceRange) * plotHPrice;
  const syMacd = (v: number) => macdPanelTop + plotHMacd - ((v - macdMin) / macdRange) * plotHMacd;
  const zeroY = syMacd(0);

  // ── SVG paths ───────────────────────────────────────────────────────────────
  const pricePath = rawPrices.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${syPrice(p).toFixed(1)}`).join(" ");
  const ema12Path = ema12.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${syPrice(p).toFixed(1)}`).join(" ");
  const ema26Path = ema26.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${syPrice(p).toFixed(1)}`).join(" ");
  const macdPath = macdLine.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${syMacd(v).toFixed(1)}`).join(" ");
  const signalPath = signalLine.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${syMacd(v).toFixed(1)}`).join(" ");

  // ── Find crossover points ───────────────────────────────────────────────────
  const crossovers: { idx: number; type: "bullish" | "bearish" }[] = [];
  for (let i = 1; i < macdLine.length; i++) {
    const prevAbove = macdLine[i - 1] > signalLine[i - 1];
    const currAbove = macdLine[i] > signalLine[i];
    if (!prevAbove && currAbove) crossovers.push({ idx: i, type: "bullish" });
    else if (prevAbove && !currAbove) crossovers.push({ idx: i, type: "bearish" });
  }

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">MACD Indicator — AAPL</h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-text-subtle">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" />
            EMA12
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-orange-400 inline-block" />
            EMA26
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ── Price panel ──────────────────────────────────────────────────── */}
        <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize="7" fill="var(--text-subtle)" fontWeight="600">
          Price
        </text>

        {/* Y-axis ticks */}
        {[priceMin, (priceMin + priceMax) / 2, priceMax].map((p) => (
          <text key={p} x={PAD_L - 4} y={syPrice(p) + 3} textAnchor="end" fontSize="7" fill="var(--text-faint)">
            ${Math.round(p)}
          </text>
        ))}

        {/* Price line */}
        <path d={pricePath} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* EMA12 */}
        <path d={ema12Path} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* EMA26 */}
        <path d={ema26Path} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* ── MACD panel ───────────────────────────────────────────────────── */}
        <text x={PAD_L - 4} y={macdPanelTop + 4} textAnchor="end" fontSize="7" fill="var(--text-subtle)" fontWeight="600">
          MACD
        </text>

        {/* Zero line */}
        <line
          x1={PAD_L} y1={zeroY} x2={PAD_L + plotW} y2={zeroY}
          stroke="var(--text-subtle)" strokeWidth="0.8" strokeDasharray="3,3"
        />
        <text x={PAD_L + plotW + 2} y={zeroY + 3} fontSize="7" fill="var(--text-faint)">0</text>

        {/* Histogram bars */}
        {histogram.map((h, i) => {
          const barX = sx(i);
          const barW = Math.max(1.5, plotW / rawPrices.length - 0.5);
          const barTop = h >= 0 ? syMacd(h) : zeroY;
          const barH = Math.abs(syMacd(h) - zeroY);
          return (
            <rect
              key={i}
              x={barX - barW / 2}
              y={barTop}
              width={barW}
              height={Math.max(0.5, barH)}
              fill={h >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"}
            />
          );
        })}

        {/* MACD line */}
        <path d={macdPath} fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Signal line */}
        <path d={signalPath} fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* ── Crossover annotations ─────────────────────────────────────────── */}
        {crossovers.map((c, idx) => {
          const cx = sx(c.idx);
          const cy = syMacd(macdLine[c.idx]);
          const isBull = c.type === "bullish";
          const color = isBull ? "#059669" : "#dc2626";
          const bgColor = isBull ? "rgba(220,252,231,0.95)" : "rgba(254,226,226,0.95)";
          const borderColor = isBull ? "#86efac" : "#fca5a5";
          const label = isBull ? "Bullish Cross → calls" : "Bearish Cross → puts";
          const arrowDir = isBull ? -1 : 1; // -1 = up, 1 = down
          const tipY = cy + arrowDir * 6;
          const labelY = cy + arrowDir * 22;
          const boxW = 80;
          const boxH = 14;
          const boxX = Math.min(Math.max(cx - boxW / 2, PAD_L), PAD_L + plotW - boxW);
          const boxY = labelY - 10;

          return (
            <g key={idx}>
              {/* Arrow stem */}
              <line
                x1={cx} y1={tipY} x2={cx} y2={tipY + arrowDir * 8}
                stroke={color} strokeWidth="1.5"
              />
              {/* Arrowhead */}
              <polygon
                points={
                  isBull
                    ? `${cx},${tipY} ${cx - 3},${tipY + 5} ${cx + 3},${tipY + 5}`
                    : `${cx},${tipY} ${cx - 3},${tipY - 5} ${cx + 3},${tipY - 5}`
                }
                fill={color}
              />
              {/* Label box */}
              <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="3" fill={bgColor} stroke={borderColor} strokeWidth="0.5" />
              <text x={boxX + boxW / 2} y={boxY + 9} textAnchor="middle" fontSize="7" fill={color} fontWeight="700">
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* MACD panel legend */}
      <div className="flex items-center justify-center gap-4 mt-1 mb-3 text-[10px] text-gray-500 dark:text-text-subtle">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-blue-500 inline-block" />
          MACD
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-orange-400 inline-block" />
          Signal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />
          +Hist
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />
          -Hist
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-emerald-50 dark:bg-gain-bg border border-emerald-100 dark:border-gain-border rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-emerald-600 dark:text-gain font-bold text-xs">Bullish MACD Cross</span>
          </div>
          <p className="text-[10px] text-gray-600 dark:text-text-muted leading-snug">
            MACD line crosses <span className="font-semibold text-emerald-700 dark:text-gain-strong">above</span> signal line
            → upward momentum building
            → consider <span className="font-semibold text-emerald-700 dark:text-gain-strong">call options</span>
          </p>
        </div>
        <div className="bg-red-50 dark:bg-loss-bg border border-red-100 dark:border-loss-border rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-red-600 dark:text-loss font-bold text-xs">Bearish MACD Cross</span>
          </div>
          <p className="text-[10px] text-gray-600 dark:text-text-muted leading-snug">
            MACD line crosses <span className="font-semibold text-red-600 dark:text-loss">below</span> signal line
            → downward momentum building
            → consider <span className="font-semibold text-red-600 dark:text-loss">put options</span>
          </p>
        </div>
      </div>
    </div>
  );
}
