"use client";

import { useState, useMemo } from "react";

interface TAGreeksChartProps {
  mode?: "csp-entry" | "synergy";
  showSupport?: boolean;
  showGreeks?: boolean;
  showLevels?: boolean;
}

type PriceBar = { price: number; rsi: number };

function generateCSPData(): PriceBar[] {
  return [
    { price: 108, rsi: 62 }, { price: 106, rsi: 55 }, { price: 104, rsi: 48 },
    { price: 101, rsi: 40 }, { price: 98, rsi: 33 }, { price: 96, rsi: 28 },
    { price: 94, rsi: 24 }, { price: 93, rsi: 22 }, // <-- support + oversold
    { price: 94, rsi: 30 }, { price: 96, rsi: 38 }, { price: 99, rsi: 48 },
    { price: 102, rsi: 55 }, { price: 104, rsi: 60 }, { price: 106, rsi: 65 },
  ];
}

function generateSynergyData(): PriceBar[] {
  return [
    { price: 100, rsi: 50 }, { price: 103, rsi: 58 }, { price: 106, rsi: 65 },
    { price: 108, rsi: 72 }, { price: 107, rsi: 68 }, // <-- resistance + overbought
    { price: 104, rsi: 55 }, { price: 101, rsi: 45 }, { price: 98, rsi: 35 },
    { price: 95, rsi: 28 }, { price: 93, rsi: 24 }, // <-- support + oversold
    { price: 95, rsi: 33 }, { price: 98, rsi: 42 }, { price: 101, rsi: 52 },
    { price: 104, rsi: 60 },
  ];
}

export default function TAGreeksChart({
  mode = "csp-entry",
  showSupport = true,
  showGreeks = false,
  showLevels = true,
}: TAGreeksChartProps) {
  const [showGreekPanel, setShowGreekPanel] = useState(showGreeks);

  const W = 360;
  const H_PRICE = 130;
  const H_GREEK = showGreekPanel ? 80 : 0;
  const H = H_PRICE + H_GREEK + 50;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H_PRICE - PAD_T;

  const data = useMemo(() => mode === "synergy" ? generateSynergyData() : generateCSPData(), [mode]);
  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices) - 3;
  const maxP = Math.max(...prices) + 3;

  const scaleX = (i: number) => PAD_L + (i / (data.length - 1)) * plotW;
  const scaleY = (p: number) => PAD_T + plotH - ((p - minP) / (maxP - minP)) * plotH;

  const pricePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(d.price)}`).join(" ");

  // Find entry points (oversold at support)
  const entryPoints = data
    .map((d, i) => ({ ...d, i }))
    .filter((d) => d.rsi < 30 && d.price <= 95);

  // Find sell points (overbought at resistance)
  const sellPoints = data
    .map((d, i) => ({ ...d, i }))
    .filter((d) => d.rsi > 68 && d.price >= 107);

  const supportLevel = 93;
  const resistanceLevel = 108;

  // Greek panel data at entry point
  const greekAtEntry = {
    delta: -0.25,
    gamma: -0.03,
    theta: 0.06,
    vega: -0.08,
    premium: 2.85,
    strike: 93,
    dte: 35,
  };

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">
          {mode === "csp-entry" ? "CSP Entry at Support" : "TA + Greeks Synergy"}
        </h3>
        <button
          onClick={() => setShowGreekPanel(!showGreekPanel)}
          className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
            showGreekPanel ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-surface-muted text-gray-600 dark:text-text-muted"
          }`}
        >
          Greeks
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Support zone */}
        {showSupport && showLevels && (
          <g>
            <rect
              x={PAD_L}
              y={scaleY(supportLevel + 1)}
              width={plotW}
              height={scaleY(supportLevel - 1) - scaleY(supportLevel + 1)}
              fill="rgba(16,185,129,0.1)"
              rx="2"
            />
            <line
              x1={PAD_L} y1={scaleY(supportLevel)} x2={PAD_L + plotW} y2={scaleY(supportLevel)}
              stroke="var(--gain)" strokeWidth="1.5" strokeDasharray="6,3"
            />
            <text x={PAD_L + 4} y={scaleY(supportLevel) + 14} fontSize="8" fill="var(--gain)" fontWeight="600">
              Support ${supportLevel}
            </text>
          </g>
        )}

        {/* Resistance zone */}
        {showLevels && (
          <g>
            <rect
              x={PAD_L}
              y={scaleY(resistanceLevel + 1)}
              width={plotW}
              height={scaleY(resistanceLevel - 1) - scaleY(resistanceLevel + 1)}
              fill="rgba(239,68,68,0.1)"
              rx="2"
            />
            <line
              x1={PAD_L} y1={scaleY(resistanceLevel)} x2={PAD_L + plotW} y2={scaleY(resistanceLevel)}
              stroke="var(--loss)" strokeWidth="1.5" strokeDasharray="6,3"
            />
            <text x={PAD_L + 4} y={scaleY(resistanceLevel) - 8} fontSize="8" fill="#dc2626" fontWeight="600">
              Resistance ${resistanceLevel}
            </text>
          </g>
        )}

        {/* Price line */}
        <path d={pricePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Price dots */}
        {data.map((d, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(d.price)} r="2.5" fill="#3b82f6" />
        ))}

        {/* Entry points (CSP sell) */}
        {entryPoints.map((ep, i) => (
          <g key={`entry-${i}`}>
            <circle cx={scaleX(ep.i)} cy={scaleY(ep.price)} r="6" fill="none" stroke="var(--gain)" strokeWidth="2" />
            <text
              x={scaleX(ep.i)}
              y={scaleY(ep.price) + 18}
              textAnchor="middle"
              fontSize="7"
              fill="var(--gain)"
              fontWeight="700"
            >
              SELL PUT
            </text>
            <text
              x={scaleX(ep.i)}
              y={scaleY(ep.price) + 26}
              textAnchor="middle"
              fontSize="6"
              fill="var(--text-subtle)"
            >
              RSI: {ep.rsi}
            </text>
          </g>
        ))}

        {/* Sell call points (at resistance) */}
        {mode === "synergy" && sellPoints.map((sp, i) => (
          <g key={`sell-${i}`}>
            <circle cx={scaleX(sp.i)} cy={scaleY(sp.price)} r="6" fill="none" stroke="var(--loss)" strokeWidth="2" />
            <text
              x={scaleX(sp.i)}
              y={scaleY(sp.price) - 12}
              textAnchor="middle"
              fontSize="7"
              fill="#dc2626"
              fontWeight="700"
            >
              SELL CALL
            </text>
            <text
              x={scaleX(sp.i)}
              y={scaleY(sp.price) - 4}
              textAnchor="middle"
              fontSize="6"
              fill="var(--text-subtle)"
            >
              RSI: {sp.rsi}
            </text>
          </g>
        ))}

        {/* Y-axis */}
        {[minP, (minP + maxP) / 2, maxP].map((p) => (
          <text key={p} x={PAD_L - 4} y={scaleY(p) + 3} textAnchor="end" fontSize="7" fill="var(--text-faint)">
            ${Math.round(p)}
          </text>
        ))}

        {/* Greeks panel */}
        {showGreekPanel && (
          <g>
            <rect x={PAD_L} y={H_PRICE + 10} width={plotW} height={H_GREEK - 10} rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />

            <text x={PAD_L + 8} y={H_PRICE + 26} fontSize="9" fill="var(--text-muted)" fontWeight="700">
              CSP Greeks at Entry (K=${greekAtEntry.strike}, {greekAtEntry.dte} DTE)
            </text>

            {/* Greek values */}
            {[
              { label: "Delta", value: greekAtEntry.delta.toFixed(2), color: "#2563eb", x: 0 },
              { label: "Gamma", value: greekAtEntry.gamma.toFixed(2), color: "#d97706", x: 1 },
              { label: "Theta", value: `+$${greekAtEntry.theta.toFixed(2)}`, color: "#059669", x: 2 },
              { label: "Vega", value: greekAtEntry.vega.toFixed(2), color: "#7c3aed", x: 3 },
              { label: "Premium", value: `$${greekAtEntry.premium.toFixed(2)}`, color: "#374151", x: 4 },
            ].map((g) => {
              const gx = PAD_L + 12 + g.x * (plotW / 5);
              return (
                <g key={g.label}>
                  <text x={gx} y={H_PRICE + 44} fontSize="7" fill="var(--text-subtle)">{g.label}</text>
                  <text x={gx} y={H_PRICE + 56} fontSize="10" fill={g.color} fontWeight="700">{g.value}</text>
                </g>
              );
            })}

            {/* Interpretation */}
            <text x={PAD_L + 8} y={H_PRICE + 72} fontSize="7" fill="var(--gain)" fontWeight="600">
              Theta positive = $6/day income | Delta -0.25 = ~75% win rate
            </text>
          </g>
        )}
      </svg>

      {/* Context label */}
      <div className="mt-2 text-center text-xs text-gray-500 dark:text-text-subtle">
        {mode === "csp-entry"
          ? "Sell puts when price hits support AND RSI is oversold"
          : "Align Greeks exposure with TA levels for higher probability trades"
        }
      </div>
    </div>
  );
}
