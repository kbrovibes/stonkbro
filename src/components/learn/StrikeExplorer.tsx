"use client";

import { useMemo, useState } from "react";

// Standard normal CDF via Abramowitz–Stegun erf approximation (~1e-7).
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-(x * x) / 2);
  const p =
    d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
function normPdf(x: number): number {
  return 0.3989422804014327 * Math.exp(-(x * x) / 2);
}

const S = 100; // underlying, fixed
const R = 0.04; // risk-free rate

interface BsResult {
  premium: number; // per share
  delta: number;
  thetaPerDay: number;
}

function blackScholes(K: number, T: number, sigma: number, isCall: boolean): BsResult {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (R + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const disc = Math.exp(-R * T);
  let premium: number;
  let delta: number;
  let theta: number; // per year
  if (isCall) {
    premium = S * normCdf(d1) - K * disc * normCdf(d2);
    delta = normCdf(d1);
    theta = -(S * sigma * normPdf(d1)) / (2 * sqrtT) - R * K * disc * normCdf(d2);
  } else {
    premium = K * disc * normCdf(-d2) - S * normCdf(-d1);
    delta = normCdf(d1) - 1;
    theta = -(S * sigma * normPdf(d1)) / (2 * sqrtT) + R * K * disc * normCdf(-d2);
  }
  return { premium: Math.max(0, premium), delta, thetaPerDay: theta / 365 };
}

// Risk-neutral probability the stock finishes above B at expiry.
function probAbove(B: number, T: number, sigma: number): number {
  const num = Math.log(S / B) + (R - (sigma * sigma) / 2) * T;
  return normCdf(num / (sigma * Math.sqrt(T)));
}

const W = 360;
const H = 180;
const PAD_L = 40;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;
const plotW = W - PAD_L - PAD_R;
const plotH = H - PAD_T - PAD_B;

export default function StrikeExplorer() {
  const [moneyness, setMoneyness] = useState(0); // -20..+20 (%)
  const [dte, setDte] = useState(30);
  const [ivPct, setIvPct] = useState(30);
  const [isCall, setIsCall] = useState(true);
  const [isBuy, setIsBuy] = useState(true);

  const K = useMemo(() => Math.round(S * (1 + moneyness / 100) * 100) / 100, [moneyness]);
  const T = dte / 365;
  const sigma = ivPct / 100;

  const bs = useMemo(() => blackScholes(K, T, sigma, isCall), [K, T, sigma, isCall]);
  const dir = isBuy ? 1 : -1;
  const premiumContract = bs.premium * 100;

  // Breakeven at expiry
  const breakeven = isCall ? K + bs.premium : K - bs.premium;

  // Direction-adjusted greeks (per contract for theta)
  const posDelta = bs.delta * dir;
  const posThetaDay = bs.thetaPerDay * dir * 100;

  // Profit probability
  const longPop = isCall ? probAbove(breakeven, T, sigma) : 1 - probAbove(breakeven, T, sigma);
  const pop = isBuy ? longPop : 1 - longPop;

  // Max loss / gain per contract
  let maxLoss: number | null;
  let maxGain: number | null;
  if (isCall && isBuy) {
    maxLoss = premiumContract;
    maxGain = null; // unlimited
  } else if (isCall && !isBuy) {
    maxLoss = null; // unlimited
    maxGain = premiumContract;
  } else if (!isCall && isBuy) {
    maxLoss = premiumContract;
    maxGain = (K - bs.premium) * 100;
  } else {
    maxLoss = (K - bs.premium) * 100;
    maxGain = premiumContract;
  }

  // Payoff diagram ----------------------------------------------------------
  const sMin = S * 0.6;
  const sMax = S * 1.4;
  const payoff = (sT: number): number => {
    const intrinsic = isCall ? Math.max(sT - K, 0) : Math.max(K - sT, 0);
    return (intrinsic - bs.premium) * dir * 100;
  };
  const samples = 60;
  const pls = Array.from({ length: samples + 1 }, (_, i) => payoff(sMin + (i / samples) * (sMax - sMin)));
  const plMin = Math.min(...pls);
  const plMax = Math.max(...pls);
  const plRange = plMax - plMin || 1;
  const px = (sT: number) => PAD_L + ((sT - sMin) / (sMax - sMin)) * plotW;
  const py = (pl: number) => PAD_T + plotH - ((pl - plMin) / plRange) * plotH;
  const zeroY = py(0);
  const pathD = pls
    .map((pl, i) => `${i === 0 ? "M" : "L"}${px(sMin + (i / samples) * (sMax - sMin)).toFixed(1)},${py(pl).toFixed(1)}`)
    .join(" ");

  const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const actionWord = isBuy ? "pay" : "collect";
  const rightWord = isCall ? "buy" : "sell";
  const readout = isBuy
    ? `You ${actionWord} ${fmt(premiumContract)} for the right to ${rightWord} at $${K.toFixed(0)}; you profit if the stock ${isCall ? "rises past" : "falls below"} $${breakeven.toFixed(2)} by expiry.`
    : `You ${actionWord} ${fmt(premiumContract)} up front; you keep it all if the stock stays ${isCall ? "below" : "above"} $${K.toFixed(0)}, and start losing past $${breakeven.toFixed(2)}.`;

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-2xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Strike Explorer</h3>
        <div className="flex gap-1">
          <div className="flex rounded-full bg-gray-100 dark:bg-surface-muted p-0.5">
            <button onClick={() => setIsBuy(true)} className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${isBuy ? "bg-blue-500 text-white" : "text-gray-500 dark:text-text-subtle"}`}>Buy</button>
            <button onClick={() => setIsBuy(false)} className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${!isBuy ? "bg-blue-500 text-white" : "text-gray-500 dark:text-text-subtle"}`}>Sell</button>
          </div>
          <div className="flex rounded-full bg-gray-100 dark:bg-surface-muted p-0.5">
            <button onClick={() => setIsCall(true)} className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${isCall ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-text-subtle"}`}>Call</button>
            <button onClick={() => setIsCall(false)} className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${!isCall ? "bg-red-500 text-white" : "text-gray-500 dark:text-text-subtle"}`}>Put</button>
          </div>
        </div>
      </div>

      {/* Payoff diagram */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* profit / loss shading split at zero line */}
        <rect x={PAD_L} y={PAD_T} width={plotW} height={Math.max(0, zeroY - PAD_T)} fill="rgba(16,185,129,0.05)" />
        <rect x={PAD_L} y={zeroY} width={plotW} height={Math.max(0, PAD_T + plotH - zeroY)} fill="rgba(239,68,68,0.05)" />
        <line x1={PAD_L} y1={zeroY} x2={PAD_L + plotW} y2={zeroY} stroke="var(--text-faint)" strokeWidth="0.75" strokeDasharray="4,3" />

        {/* current price marker */}
        <line x1={px(S)} y1={PAD_T} x2={px(S)} y2={PAD_T + plotH} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
        <text x={px(S)} y={PAD_T + plotH + 16} textAnchor="middle" fontSize="7.5" fill="var(--text-subtle)">Now ${S}</text>

        {/* strike marker */}
        <line x1={px(K)} y1={PAD_T} x2={px(K)} y2={PAD_T + plotH} stroke="#c084fc" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* payoff line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

        {/* breakeven marker */}
        {breakeven > sMin && breakeven < sMax && (
          <g>
            <circle cx={px(breakeven)} cy={zeroY} r="3.5" fill="#f59e0b" stroke="white" strokeWidth="1" />
            <text x={px(breakeven)} y={PAD_T + 10} textAnchor="middle" fontSize="7.5" fill="#d97706" fontWeight="700">
              BE ${breakeven.toFixed(0)}
            </text>
          </g>
        )}

        {/* y labels */}
        <text x={PAD_L - 4} y={py(plMax) + 3} textAnchor="end" fontSize="7" fill="var(--text-faint)">{fmt(plMax)}</text>
        <text x={PAD_L - 4} y={py(plMin) + 3} textAnchor="end" fontSize="7" fill="var(--text-faint)">{fmt(plMin)}</text>
      </svg>

      {/* Plain-English readout */}
      <p className="text-sm text-gray-700 dark:text-text-muted leading-relaxed mt-2 mb-3">{readout}</p>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <Metric label="Premium" value={fmt(premiumContract)} />
        <Metric label="Breakeven" value={`$${breakeven.toFixed(2)}`} />
        <Metric label="POP" value={`${Math.round(pop * 100)}%`} />
        <Metric label="Delta" value={posDelta.toFixed(2)} />
        <Metric label="Theta/day" value={fmt(posThetaDay)} tone={posThetaDay < 0 ? "loss" : "gain"} />
        <Metric label="Max loss" value={maxLoss == null ? "Unlimited" : fmt(-maxLoss)} tone="loss" />
      </div>
      <div className="grid grid-cols-1 mb-3 text-center">
        <Metric label="Max gain" value={maxGain == null ? "Unlimited" : fmt(maxGain)} tone="gain" />
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-2.5">
        <ExplorerSlider label="Strike" value={moneyness} min={-20} max={20} step={1} onChange={setMoneyness} display={`$${K.toFixed(0)} (${moneyness > 0 ? "+" : ""}${moneyness}%)`} />
        <ExplorerSlider label="Days to expiry" value={dte} min={7} max={365} step={1} onChange={setDte} display={`${dte}d`} />
        <ExplorerSlider label="Implied volatility" value={ivPct} min={15} max={120} step={1} onChange={setIvPct} display={`${ivPct}%`} />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  const color =
    tone === "gain"
      ? "text-green-600 dark:text-gain"
      : tone === "loss"
        ? "text-red-600 dark:text-loss"
        : "text-gray-900 dark:text-text";
  return (
    <div className="bg-gray-50 dark:bg-surface-muted rounded-lg py-2 px-1">
      <div className="text-[10px] text-gray-500 dark:text-text-subtle uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ExplorerSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-text-muted font-medium">{label}</span>
        <span className="text-gray-900 dark:text-text font-semibold tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-6 appearance-none cursor-pointer
          [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-[7px]
          [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-200
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
      />
    </div>
  );
}
