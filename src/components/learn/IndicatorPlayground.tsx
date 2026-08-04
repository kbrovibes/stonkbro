"use client";

import { useMemo, useState } from "react";
import {
  genSeries,
  sma,
  ema,
  rsi,
  macd,
  bollinger,
  crossovers,
  percentile,
  type SeriesPreset,
} from "./chartMath";

interface IndicatorPlaygroundProps {
  preset?: SeriesPreset;
  seed?: number;
}

const W = 360;
const PAD_L = 34;
const PAD_R = 12;
const plotW = W - PAD_L - PAD_R;
const PRICE_TOP = 22;
const PRICE_H = 172;
const PANE_GAP = 10;
const PANE_H = 58;

type Toggles = {
  smaFast: boolean;
  sma50: boolean;
  sma200: boolean;
  ema21: boolean;
  bb: boolean;
  rsi: boolean;
  macd: boolean;
};

function linePath(
  values: (number | null)[],
  sx: (i: number) => number,
  sy: (v: number) => number,
): string {
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

export default function IndicatorPlayground({
  preset = "trend",
  seed = 7,
}: IndicatorPlaygroundProps) {
  const [show, setShow] = useState<Toggles>(() => ({
    smaFast: true,
    sma50: true,
    sma200: preset === "trend",
    ema21: false,
    bb: preset === "squeeze",
    rsi: preset === "divergence" || preset === "meanreversion",
    macd: false,
  }));
  const [smaPeriod, setSmaPeriod] = useState(20);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [bbMult, setBbMult] = useState(2);

  const candles = useMemo(() => genSeries(seed, 120, preset), [seed, preset]);
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const n = candles.length;

  const smaFast = useMemo(() => sma(closes, smaPeriod), [closes, smaPeriod]);
  const sma50 = useMemo(() => sma(closes, 50), [closes]);
  const sma200 = useMemo(() => sma(closes, 200), [closes]);
  const ema21 = useMemo(() => ema(closes, 21), [closes]);
  const rsiVals = useMemo(() => rsi(closes, rsiPeriod), [closes, rsiPeriod]);
  const macdVals = useMemo(() => macd(closes), [closes]);
  const bb = useMemo(() => bollinger(closes, 20, bbMult), [closes, bbMult]);

  // Signal detection ---------------------------------------------------------
  const crosses = useMemo(() => {
    if (!show.smaFast || !show.sma50) return [];
    return crossovers(smaFast, sma50);
  }, [show.smaFast, show.sma50, smaFast, sma50]);

  const squeezeBars = useMemo(() => {
    if (!show.bb) return new Set<number>();
    const thresh = percentile(bb.bandwidth, 0.25);
    const s = new Set<number>();
    if (thresh == null) return s;
    bb.bandwidth.forEach((v, i) => {
      if (v != null && v <= thresh) s.add(i);
    });
    return s;
  }, [show.bb, bb.bandwidth]);

  const bandTags = useMemo(() => {
    if (!show.bb) return [];
    const tags: { i: number; side: "upper" | "lower" }[] = [];
    for (let i = 0; i < n; i++) {
      const u = bb.upper[i];
      const l = bb.lower[i];
      if (u != null && candles[i].high >= u) tags.push({ i, side: "upper" });
      else if (l != null && candles[i].low <= l) tags.push({ i, side: "lower" });
    }
    return tags;
  }, [show.bb, bb.upper, bb.lower, candles, n]);

  const rsiCrosses = useMemo(() => {
    if (!show.rsi) return [];
    const out: { i: number; kind: "oversold" | "overbought" }[] = [];
    for (let i = 1; i < n; i++) {
      const a = rsiVals[i - 1];
      const b = rsiVals[i];
      if (a == null || b == null) continue;
      if (a >= 30 && b < 30) out.push({ i, kind: "oversold" });
      if (a <= 70 && b > 70) out.push({ i, kind: "overbought" });
    }
    return out;
  }, [show.rsi, rsiVals, n]);

  // Price scale (candles + any visible price-panel overlay) ------------------
  const priceExtent = useMemo(() => {
    const vals: number[] = [];
    candles.forEach((c) => {
      vals.push(c.high, c.low);
    });
    const push = (arr: (number | null)[]) =>
      arr.forEach((v) => {
        if (v != null) vals.push(v);
      });
    if (show.smaFast) push(smaFast);
    if (show.sma50) push(sma50);
    if (show.sma200) push(sma200);
    if (show.ema21) push(ema21);
    if (show.bb) {
      push(bb.upper);
      push(bb.lower);
    }
    return { min: Math.min(...vals) - 1, max: Math.max(...vals) + 1 };
  }, [candles, show, smaFast, sma50, sma200, ema21, bb]);

  const priceRange = priceExtent.max - priceExtent.min || 1;
  const sx = (i: number) => PAD_L + (i / (n - 1)) * plotW;
  const priceY = (p: number) => PRICE_TOP + PRICE_H - ((p - priceExtent.min) / priceRange) * PRICE_H;
  const barW = Math.max(1, (plotW / n) * 0.6);

  // Pane layout --------------------------------------------------------------
  let cursor = PRICE_TOP + PRICE_H + PANE_GAP;
  const rsiTop = show.rsi ? cursor : 0;
  if (show.rsi) cursor += PANE_H + PANE_GAP;
  const macdTop = show.macd ? cursor : 0;
  if (show.macd) cursor += PANE_H + PANE_GAP;
  const H = cursor + 6;

  const rsiY = (v: number) => rsiTop + PANE_H - (v / 100) * PANE_H;

  const macdExtent = useMemo(() => {
    if (!show.macd) return 1;
    let m = 0.5;
    [macdVals.macd, macdVals.signal, macdVals.histogram].forEach((arr) =>
      arr.forEach((v) => {
        if (v != null) m = Math.max(m, Math.abs(v));
      }),
    );
    return m;
  }, [show.macd, macdVals]);
  const macdY = (v: number) => macdTop + PANE_H / 2 - (v / macdExtent) * (PANE_H / 2);

  const chip = (key: keyof Toggles, label: string, color: string) => (
    <button
      key={key}
      onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
      className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors border ${
        show[key]
          ? "text-white border-transparent"
          : "bg-gray-100 dark:bg-surface-muted text-gray-500 dark:text-text-subtle border-transparent"
      }`}
      style={show[key] ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );

  const goldenCount = crosses.filter((c) => c.dir === "up").length;
  const deathCount = crosses.filter((c) => c.dir === "down").length;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-2xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Indicator Playground</h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-text-faint font-semibold">
          {preset}
        </span>
      </div>

      {/* Toggle chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {chip("smaFast", `SMA${smaPeriod}`, "#3b82f6")}
        {chip("sma50", "SMA50", "#f59e0b")}
        {chip("sma200", "SMA200", "#8b5cf6")}
        {chip("ema21", "EMA21", "#ec4899")}
        {chip("bb", "Bollinger", "#64748b")}
        {chip("rsi", "RSI", "#0ea5e9")}
        {chip("macd", "MACD", "#14b8a6")}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* BB squeeze shading */}
        {show.bb &&
          Array.from(squeezeBars).map((i) => (
            <rect
              key={`sq-${i}`}
              x={sx(i) - barW / 2}
              y={PRICE_TOP}
              width={Math.max(barW, plotW / n)}
              height={PRICE_H}
              fill="rgba(100,116,139,0.10)"
            />
          ))}

        {/* Bollinger bands */}
        {show.bb && (
          <>
            <path d={linePath(bb.upper, sx, priceY)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2" />
            <path d={linePath(bb.middle, sx, priceY)} fill="none" stroke="#64748b" strokeWidth="1" />
            <path d={linePath(bb.lower, sx, priceY)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2" />
          </>
        )}

        {/* Candlesticks */}
        {candles.map((d, i) => {
          const x = sx(i);
          const isUp = d.close >= d.open;
          const bodyTop = priceY(Math.max(d.open, d.close));
          const bodyBot = priceY(Math.min(d.open, d.close));
          const col = isUp ? "#16a34a" : "#dc2626";
          return (
            <g key={i}>
              <line x1={x} y1={priceY(d.high)} x2={x} y2={priceY(d.low)} stroke={col} strokeWidth="0.7" />
              <rect x={x - barW / 2} y={bodyTop} width={barW} height={Math.max(0.6, bodyBot - bodyTop)} fill={col} />
            </g>
          );
        })}

        {/* Moving averages */}
        {show.smaFast && <path d={linePath(smaFast, sx, priceY)} fill="none" stroke="#3b82f6" strokeWidth="1.4" />}
        {show.sma50 && <path d={linePath(sma50, sx, priceY)} fill="none" stroke="#f59e0b" strokeWidth="1.4" />}
        {show.sma200 && <path d={linePath(sma200, sx, priceY)} fill="none" stroke="#8b5cf6" strokeWidth="1.4" />}
        {show.ema21 && <path d={linePath(ema21, sx, priceY)} fill="none" stroke="#ec4899" strokeWidth="1.4" strokeDasharray="4,2" />}

        {/* Band tags */}
        {bandTags.map((t) => (
          <circle
            key={`bt-${t.i}`}
            cx={sx(t.i)}
            cy={t.side === "upper" ? priceY(candles[t.i].high) : priceY(candles[t.i].low)}
            r="2"
            fill={t.side === "upper" ? "#dc2626" : "#16a34a"}
          />
        ))}

        {/* Golden / death cross markers */}
        {crosses.map((c) => {
          const cy = priceY(sma50[c.index] as number);
          const col = c.dir === "up" ? "#10b981" : "#ef4444";
          return (
            <g key={`x-${c.index}`}>
              <circle cx={sx(c.index)} cy={cy} r="4.5" fill="none" stroke={col} strokeWidth="1.5" />
              <text x={sx(c.index)} y={c.dir === "up" ? cy + 15 : cy - 9} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={col}>
                {c.dir === "up" ? "Golden" : "Death"}
              </text>
            </g>
          );
        })}

        {/* Y labels (price) */}
        {Array.from({ length: 4 }, (_, i) => {
          const p = priceExtent.min + (i / 3) * priceRange;
          return (
            <text key={i} x={PAD_L - 4} y={priceY(p) + 3} textAnchor="end" fontSize="7" fill="var(--text-faint)">
              {Math.round(p)}
            </text>
          );
        })}

        {/* RSI pane */}
        {show.rsi && (
          <g>
            <rect x={PAD_L} y={rsiY(100)} width={plotW} height={rsiY(70) - rsiY(100)} fill="rgba(239,68,68,0.05)" />
            <rect x={PAD_L} y={rsiY(30)} width={plotW} height={rsiY(0) - rsiY(30)} fill="rgba(16,185,129,0.05)" />
            <line x1={PAD_L} y1={rsiY(70)} x2={PAD_L + plotW} y2={rsiY(70)} stroke="#fca5a5" strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1={PAD_L} y1={rsiY(30)} x2={PAD_L + plotW} y2={rsiY(30)} stroke="#86efac" strokeWidth="0.5" strokeDasharray="3,3" />
            <path d={linePath(rsiVals, sx, rsiY)} fill="none" stroke="#0ea5e9" strokeWidth="1.3" />
            {rsiCrosses.map((c) => (
              <circle key={`rc-${c.i}`} cx={sx(c.i)} cy={rsiY(rsiVals[c.i] as number)} r="2.5" fill={c.kind === "oversold" ? "#10b981" : "#ef4444"} />
            ))}
            <text x={PAD_L - 4} y={rsiY(50) + 3} textAnchor="end" fontSize="7" fill="var(--text-subtle)" fontWeight="600">RSI</text>
          </g>
        )}

        {/* MACD pane */}
        {show.macd && (
          <g>
            <line x1={PAD_L} y1={macdY(0)} x2={PAD_L + plotW} y2={macdY(0)} stroke="var(--text-faint)" strokeWidth="0.5" />
            {macdVals.histogram.map((v, i) =>
              v == null ? null : (
                <rect
                  key={`mh-${i}`}
                  x={sx(i) - barW / 2}
                  y={Math.min(macdY(0), macdY(v))}
                  width={barW}
                  height={Math.max(0.5, Math.abs(macdY(v) - macdY(0)))}
                  fill={v >= 0 ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"}
                />
              ),
            )}
            <path d={linePath(macdVals.macd, sx, macdY)} fill="none" stroke="#3b82f6" strokeWidth="1.2" />
            <path d={linePath(macdVals.signal, sx, macdY)} fill="none" stroke="#ef4444" strokeWidth="1.2" />
            <text x={PAD_L - 4} y={macdTop + 10} textAnchor="end" fontSize="7" fill="var(--text-subtle)" fontWeight="600">MACD</text>
          </g>
        )}
      </svg>

      {/* Period sliders */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <MiniSlider label="SMA period" value={smaPeriod} min={5} max={100} step={1} onChange={setSmaPeriod} />
        <MiniSlider label="RSI period" value={rsiPeriod} min={5} max={30} step={1} onChange={setRsiPeriod} disabled={!show.rsi} />
        <MiniSlider label="BB σ" value={bbMult} min={1} max={3} step={0.5} onChange={setBbMult} disabled={!show.bb} />
      </div>

      {/* Signal readout */}
      <div className="mt-3 text-xs text-gray-600 dark:text-text-muted leading-relaxed">
        {goldenCount + deathCount > 0 && (
          <span>
            {goldenCount > 0 && <><span className="font-semibold text-emerald-600 dark:text-gain">{goldenCount} golden cross{goldenCount > 1 ? "es" : ""}</span> (SMA{smaPeriod} over SMA50, momentum turning up). </>}
            {deathCount > 0 && <><span className="font-semibold text-red-600 dark:text-loss">{deathCount} death cross{deathCount > 1 ? "es" : ""}</span> (SMA{smaPeriod} under SMA50). </>}
          </span>
        )}
        {show.bb && squeezeBars.size > 0 && (
          <span>Shaded regions are <span className="font-semibold">Bollinger squeezes</span> — bands tight, volatility coiling for a move. </span>
        )}
        {show.rsi && rsiCrosses.length > 0 && (
          <span>Dots on RSI mark crosses of 30/70 — momentum extremes. </span>
        )}
        {goldenCount + deathCount === 0 && !(show.bb && squeezeBars.size) && !(show.rsi && rsiCrosses.length) && (
          <span>Toggle indicators and drag the sliders to see how each responds to the same price action.</span>
        )}
      </div>
    </div>
  );
}

function MiniSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-500 dark:text-text-subtle font-medium">{label}</span>
        <span className="text-gray-900 dark:text-text font-semibold tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-5 appearance-none cursor-pointer disabled:cursor-not-allowed
          [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-[6px]
          [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-200
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
      />
    </div>
  );
}
