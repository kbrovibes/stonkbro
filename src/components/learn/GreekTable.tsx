"use client";

import { useState, useMemo } from "react";
import InteractiveSlider from "./InteractiveSlider";

// Abramowitz & Stegun approximation for standard normal CDF
function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal PDF
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

function calcGreeks(S: number, K: number, T: number, sigma: number, r: number = 0.05): Greeks {
  if (T <= 0) {
    const itm = S > K;
    return {
      delta: itm ? 1 : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const delta = normCDF(d1);
  const gamma = normPDF(d1) / (S * sigma * sqrtT);
  const theta = (-(S * normPDF(d1) * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * normCDF(d2)) / 365;
  const vega = (S * normPDF(d1) * sqrtT) / 100;
  const rho = (K * T * Math.exp(-r * T) * normCDF(d2)) / 100;

  return { delta, gamma, theta, vega, rho };
}

const greekConfig = [
  { key: "delta" as const, label: "Delta", color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/40", desc: "Price sensitivity" },
  { key: "gamma" as const, label: "Gamma", color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40", desc: "Delta sensitivity" },
  { key: "theta" as const, label: "Theta", color: "text-emerald-600 dark:text-gain", bg: "bg-emerald-50 dark:bg-gain-bg", desc: "Time decay/day" },
  { key: "vega" as const, label: "Vega", color: "text-purple-600 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/40", desc: "IV sensitivity/1%" },
  { key: "rho" as const, label: "Rho", color: "text-rose-600 dark:text-loss", bg: "bg-rose-50 dark:bg-loss-bg", desc: "Rate sensitivity/1%" },
];

export default function GreekTable() {
  const [stockPrice, setStockPrice] = useState(100);
  const [dte, setDte] = useState(30);
  const [iv, setIv] = useState(30);

  const K = 100;
  const T = dte / 365;
  const sigma = iv / 100;

  const greeks = useMemo(() => calcGreeks(stockPrice, K, T, sigma), [stockPrice, K, T, sigma]);

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <h3 className="text-sm font-bold text-gray-900 dark:text-text mb-1">Option Greeks Calculator</h3>
      <p className="text-xs text-gray-500 dark:text-text-subtle mb-3">
        Strike: ${K} | Risk-free rate: 5%
      </p>

      {/* Greek values */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {greekConfig.map(({ key, label, color, bg }) => (
          <div key={key} className={`${bg} rounded-lg p-2 text-center`}>
            <div className={`text-xs font-semibold ${color}`}>{label}</div>
            <div className={`text-sm font-bold ${color} tabular-nums`}>
              {key === "theta"
                ? greeks[key].toFixed(3)
                : key === "gamma"
                  ? greeks[key].toFixed(4)
                  : greeks[key].toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      {/* Greek descriptions */}
      <div className="space-y-1 mb-4">
        {greekConfig.map(({ key, label, color, desc }) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-text-subtle">
              <span className={`font-semibold ${color}`}>{label}</span> — {desc}
            </span>
            <span className={`font-mono font-semibold ${color}`}>
              {key === "theta"
                ? `$${greeks[key].toFixed(3)}`
                : key === "vega" || key === "rho"
                  ? `$${greeks[key].toFixed(3)}`
                  : greeks[key].toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <InteractiveSlider
          min={80}
          max={120}
          value={stockPrice}
          onChange={setStockPrice}
          label="Stock Price"
          unit=""
          step={1}
        />
        <InteractiveSlider
          min={1}
          max={90}
          value={dte}
          onChange={setDte}
          label="Days to Expiry"
          unit="d"
          step={1}
        />
        <InteractiveSlider
          min={10}
          max={80}
          value={iv}
          onChange={setIv}
          label="Implied Volatility"
          unit="%"
          step={1}
        />
      </div>
    </div>
  );
}
