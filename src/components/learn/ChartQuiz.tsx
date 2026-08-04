"use client";

import { useMemo, useState } from "react";
import {
  genSeries,
  genSRSeries,
  mulberry32,
  randNormal,
  sma,
  rsi,
  crossovers,
  bollinger,
  percentile,
  type Candle,
} from "./chartMath";

export type QuizScenario =
  | "support-bounce"
  | "breakout-retest"
  | "golden-cross"
  | "death-cross"
  | "rsi-divergence"
  | "bb-squeeze";

interface ChartQuizProps {
  scenario?: QuizScenario;
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  seed?: number;
}

type Tell =
  | { kind: "hline"; price: number; color: string; label?: string }
  | { kind: "circle"; i: number; price: number; color: string; label?: string; below?: boolean }
  | { kind: "rcircle"; i: number; rsiVal: number; color: string };

type Overlay = { d: string; color: string; dash?: string };

type Scene = {
  candles: Candle[];
  min: number;
  max: number;
  overlays: Overlay[];
  squeeze?: { from: number; to: number };
  rsiVals?: (number | null)[];
  tells: Tell[];
};

// SVG geometry (module-level so the scene builder shares the same scales).
const W = 360;
const PAD_L = 34;
const PAD_R = 12;
const plotW = W - PAD_L - PAD_R;
const PRICE_TOP = 18;
const PRICE_H = 168;
const RSI_H = 56;
const RSI_GAP = 10;

function lp(values: (number | null)[], sx: (i: number) => number, sy: (v: number) => number): string {
  let d = "";
  let started = false;
  values.forEach((v, i) => {
    if (v == null) {
      started = false;
      return;
    }
    d += `${started ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)} `;
    started = true;
  });
  return d;
}

// Bespoke breakout-retest series: coil under resistance, break, retest, run.
function breakoutRetestCandles(seed: number): { candles: Candle[]; resistance: number; retestBar: number } {
  const rng = mulberry32(seed);
  const resistance = 108;
  const closes: number[] = [];
  const n = 46;
  let price = 100;
  for (let i = 0; i < n; i++) {
    if (i < 20) price = resistance - 4 + randNormal(rng) * 2.2;
    else if (i < 26) price += 1.6 + randNormal(rng) * 0.8;
    else if (i < 32) price -= 0.9 + randNormal(rng) * 0.7;
    else price += 1.4 + randNormal(rng) * 0.9;
    closes.push(price);
  }
  let retestBar = 30;
  let best = Infinity;
  for (let i = 26; i < 34; i++) {
    const dist = Math.abs(closes[i] - resistance);
    if (dist < best) {
      best = dist;
      retestBar = i;
    }
  }
  const candles: Candle[] = closes.map((c, i) => {
    const open = i === 0 ? c : closes[i - 1];
    const w = 0.4 + rng() * 0.9;
    return { open, close: c, high: Math.max(open, c) + w, low: Math.min(open, c) - w };
  });
  return { candles, resistance, retestBar };
}

function buildScene(scenario: QuizScenario, seed: number): Scene {
  const sx = (i: number, count: number) => PAD_L + (i / (count - 1)) * plotW;
  const makeY = (min: number, max: number) => (p: number) =>
    PRICE_TOP + PRICE_H - ((p - min) / ((max - min) || 1)) * PRICE_H;
  const extent = (candles: Candle[], extra: number[] = []) => {
    const v = candles.flatMap((c) => [c.high, c.low]).concat(extra);
    return { min: Math.min(...v) - 1.5, max: Math.max(...v) + 1.5 };
  };

  if (scenario === "support-bounce") {
    const s = genSRSeries(seed, "support", 2);
    return {
      candles: s.candles,
      min: s.minPrice,
      max: s.maxPrice,
      overlays: [],
      tells: [
        { kind: "hline", price: s.level, color: "#10b981", label: "Support" },
        ...s.touches.map(
          (i): Tell => ({ kind: "circle", i, price: s.candles[i].low, color: "#10b981", below: true }),
        ),
      ],
    };
  }

  if (scenario === "breakout-retest") {
    const { candles, resistance, retestBar } = breakoutRetestCandles(seed);
    const e = extent(candles, [resistance]);
    return {
      candles,
      min: e.min,
      max: e.max,
      overlays: [],
      tells: [
        { kind: "hline", price: resistance, color: "#8b5cf6", label: "Old resistance → support" },
        { kind: "circle", i: retestBar, price: candles[retestBar].low, color: "#10b981", label: "Retest", below: true },
      ],
    };
  }

  if (scenario === "golden-cross" || scenario === "death-cross") {
    const isGolden = scenario === "golden-cross";
    const candles = genSeries(seed, 120, isGolden ? "trend" : "divergence");
    const closes = candles.map((c) => c.close);
    const s20 = sma(closes, 20);
    const s50 = sma(closes, 50);
    const e = extent(candles);
    const y = makeY(e.min, e.max);
    const X = (i: number) => sx(i, candles.length);
    const xs = crossovers(s20, s50).filter((c) => (isGolden ? c.dir === "up" : c.dir === "down"));
    const pick = xs.length ? xs[isGolden ? 0 : xs.length - 1] : null;
    return {
      candles,
      min: e.min,
      max: e.max,
      overlays: [
        { d: lp(s20, X, y), color: "#3b82f6" },
        { d: lp(s50, X, y), color: "#f59e0b" },
      ],
      tells: pick
        ? [{ kind: "circle", i: pick.index, price: s50[pick.index] as number, color: isGolden ? "#10b981" : "#ef4444", label: isGolden ? "Golden cross" : "Death cross" }]
        : [],
    };
  }

  if (scenario === "rsi-divergence") {
    const candles = genSeries(seed, 120, "divergence");
    const closes = candles.map((c) => c.close);
    const rsiVals = rsi(closes, 14);
    const e = extent(candles);
    const mid = Math.floor(candles.length * 0.5);
    let h1 = 0;
    let h2 = mid;
    for (let i = 0; i < mid; i++) if (candles[i].high > candles[h1].high) h1 = i;
    for (let i = mid; i < candles.length; i++) if (candles[i].high > candles[h2].high) h2 = i;
    return {
      candles,
      min: e.min,
      max: e.max,
      overlays: [],
      rsiVals,
      tells: [
        { kind: "circle", i: h1, price: candles[h1].high, color: "#ef4444" },
        { kind: "circle", i: h2, price: candles[h2].high, color: "#ef4444", label: "Higher high" },
        { kind: "rcircle", i: h1, rsiVal: (rsiVals[h1] as number | null) ?? 50, color: "#ef4444" },
        { kind: "rcircle", i: h2, rsiVal: (rsiVals[h2] as number | null) ?? 50, color: "#ef4444" },
      ],
    };
  }

  // bb-squeeze
  const candles = genSeries(seed, 120, "squeeze");
  const closes = candles.map((c) => c.close);
  const bb = bollinger(closes, 20, 2);
  const e = extent(candles, [
    ...bb.upper.filter((v): v is number => v != null),
    ...bb.lower.filter((v): v is number => v != null),
  ]);
  const y = makeY(e.min, e.max);
  const X = (i: number) => sx(i, candles.length);
  const thresh = percentile(bb.bandwidth, 0.25);
  let from = -1;
  let to = -1;
  bb.bandwidth.forEach((v, i) => {
    if (thresh != null && v != null && v <= thresh) {
      if (from === -1) from = i;
      to = i;
    }
  });
  return {
    candles,
    min: e.min,
    max: e.max,
    overlays: [
      { d: lp(bb.upper, X, y), color: "#94a3b8", dash: "3,2" },
      { d: lp(bb.middle, X, y), color: "#64748b" },
      { d: lp(bb.lower, X, y), color: "#94a3b8", dash: "3,2" },
    ],
    squeeze: from >= 0 ? { from, to } : undefined,
    tells: [],
  };
}

export default function ChartQuiz({
  scenario = "support-bounce",
  question = "What is this chart showing?",
  options = ["Support holding", "A breakout", "A death cross", "Nothing tradable"],
  correctIndex = 0,
  explanation = "Price tests the same floor repeatedly and bounces — that repeated level is support.",
  seed = 3,
}: ChartQuizProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const scene = useMemo(() => buildScene(scenario, seed), [scenario, seed]);

  const hasRsi = !!scene.rsiVals;
  const rsiTop = PRICE_TOP + PRICE_H + (hasRsi ? RSI_GAP : 0);
  const paneH = hasRsi ? RSI_H : 0;
  const H = rsiTop + paneH + 22;

  const range = scene.max - scene.min || 1;
  const sx = (i: number) => PAD_L + (i / (scene.candles.length - 1)) * plotW;
  const py = (p: number) => PRICE_TOP + PRICE_H - ((p - scene.min) / range) * PRICE_H;
  const rY = (v: number) => rsiTop + paneH - (v / 100) * paneH;
  const barW = Math.max(1, (plotW / scene.candles.length) * 0.6);

  const answered = selected !== null;
  const isCorrect = selected === correctIndex;
  const t = scene.tells;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-2xl shadow-sm border border-gray-100 dark:border-border-subtle p-5">
      <p className="text-gray-900 dark:text-text font-semibold text-base mb-3">{question}</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mb-3" preserveAspectRatio="xMidYMid meet">
        {/* Squeeze shading (revealed after answering) */}
        {answered && scene.squeeze && (
          <rect
            x={sx(scene.squeeze.from)}
            y={PRICE_TOP}
            width={sx(scene.squeeze.to) - sx(scene.squeeze.from)}
            height={PRICE_H}
            fill="rgba(100,116,139,0.14)"
          />
        )}

        {/* Overlays (MAs / bands) */}
        {scene.overlays.map((o, i) => (
          <path key={i} d={o.d} fill="none" stroke={o.color} strokeWidth="1.3" strokeDasharray={o.dash} />
        ))}

        {/* Candles */}
        {scene.candles.map((d, i) => {
          const x = sx(i);
          const isUp = d.close >= d.open;
          const col = isUp ? "#16a34a" : "#dc2626";
          const bodyTop = py(Math.max(d.open, d.close));
          const bodyBot = py(Math.min(d.open, d.close));
          return (
            <g key={i}>
              <line x1={x} y1={py(d.high)} x2={x} y2={py(d.low)} stroke={col} strokeWidth="0.7" />
              <rect x={x - barW / 2} y={bodyTop} width={barW} height={Math.max(0.6, bodyBot - bodyTop)} fill={col} />
            </g>
          );
        })}

        {/* RSI subpane */}
        {hasRsi && scene.rsiVals && (
          <g>
            <line x1={PAD_L} y1={rY(70)} x2={PAD_L + plotW} y2={rY(70)} stroke="#fca5a5" strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1={PAD_L} y1={rY(30)} x2={PAD_L + plotW} y2={rY(30)} stroke="#86efac" strokeWidth="0.5" strokeDasharray="3,3" />
            <path d={lp(scene.rsiVals, sx, rY)} fill="none" stroke="#0ea5e9" strokeWidth="1.2" />
            <text x={PAD_L - 4} y={rY(50) + 3} textAnchor="end" fontSize="7" fill="var(--text-subtle)" fontWeight="600">RSI</text>
          </g>
        )}

        {/* Tells (revealed after answering) */}
        {answered &&
          t.map((tell, i) => {
            if (tell.kind === "hline") {
              return (
                <g key={i}>
                  <line x1={PAD_L} y1={py(tell.price)} x2={PAD_L + plotW} y2={py(tell.price)} stroke={tell.color} strokeWidth="1.5" strokeDasharray="6,3" />
                  {tell.label && <text x={PAD_L + 3} y={py(tell.price) - 4} fontSize="8" fill={tell.color} fontWeight="700">{tell.label}</text>}
                </g>
              );
            }
            if (tell.kind === "circle") {
              return (
                <g key={i}>
                  <circle cx={sx(tell.i)} cy={py(tell.price)} r="4.5" fill="none" stroke={tell.color} strokeWidth="1.6" />
                  {tell.label && (
                    <text x={sx(tell.i)} y={tell.below ? py(tell.price) + 15 : py(tell.price) - 9} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={tell.color}>
                      {tell.label}
                    </text>
                  )}
                </g>
              );
            }
            return <circle key={i} cx={sx(tell.i)} cy={rY(tell.rsiVal)} r="3.5" fill="none" stroke={tell.color} strokeWidth="1.6" />;
          })}

        {/* Divergence trend lines connecting price highs and RSI highs */}
        {answered && scenario === "rsi-divergence" && t.length >= 4 && t[0].kind === "circle" && t[1].kind === "circle" && t[2].kind === "rcircle" && t[3].kind === "rcircle" && (
          <>
            <line x1={sx(t[0].i)} y1={py(t[0].price)} x2={sx(t[1].i)} y2={py(t[1].price)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2" />
            <line x1={sx(t[2].i)} y1={rY(t[2].rsiVal)} x2={sx(t[3].i)} y2={rY(t[3].rsiVal)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2" />
          </>
        )}
      </svg>

      {/* Options */}
      <div className="flex flex-col gap-2 mb-4">
        {options.map((opt, i) => {
          let bg = "bg-gray-50 border-gray-200 dark:border-border-default";
          if (answered) {
            if (i === correctIndex) bg = "bg-green-50 dark:bg-gain-bg border-green-400";
            else if (i === selected) bg = "bg-red-50 dark:bg-loss-bg border-red-400";
          }
          return (
            <button
              key={i}
              onClick={() => !answered && setSelected(i)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${bg} ${
                !answered ? "hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100" : ""
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && (
        <div
          className={`text-sm p-3 rounded-lg ${
            isCorrect ? "bg-green-50 dark:bg-gain-bg text-green-800 dark:text-gain-strong" : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200"
          }`}
        >
          {isCorrect ? "Correct! " : "Not quite. "}
          {explanation} <span className="opacity-80">The tell is now marked on the chart above.</span>
        </div>
      )}
    </div>
  );
}
