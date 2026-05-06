"use client";

import { useState, useMemo } from "react";
import InteractiveSlider from "./InteractiveSlider";

type StrategyType =
  | "long-call"
  | "long-put"
  | "short-call"
  | "short-put"
  | "covered-call"
  | "csp"
  | "pmcc"
  | "iron-condor"
  | "straddle";

interface StrategyConfig {
  label: string;
  strikes: number[];
  premiums: number[];
  pnl: (price: number, dte: number) => number;
  breakevens: number[];
  maxProfit: string;
  maxLoss: string;
}

function timeDecayFactor(dte: number, totalDte: number): number {
  if (totalDte <= 0) return 0;
  return Math.sqrt(dte / totalDte);
}

function getStrategy(type: StrategyType): StrategyConfig {
  const S = 100;
  const premium = 5;
  const smallPrem = 2;
  const totalDte = 90;

  switch (type) {
    case "long-call":
      return {
        label: "Long Call",
        strikes: [S],
        premiums: [premium],
        breakevens: [S + premium],
        maxProfit: "Unlimited",
        maxLoss: `$${premium.toFixed(2)}`,
        pnl: (p, dte) => {
          const intrinsic = Math.max(0, p - S);
          const tv = premium * timeDecayFactor(dte, totalDte);
          const atExpiry = intrinsic - premium;
          return dte <= 0 ? atExpiry : atExpiry + tv * (1 - intrinsic / (Math.abs(p - S) + 10));
        },
      };
    case "long-put":
      return {
        label: "Long Put",
        strikes: [S],
        premiums: [premium],
        breakevens: [S - premium],
        maxProfit: `$${(S - premium).toFixed(2)}`,
        maxLoss: `$${premium.toFixed(2)}`,
        pnl: (p, dte) => {
          const intrinsic = Math.max(0, S - p);
          const tv = premium * timeDecayFactor(dte, totalDte);
          const atExpiry = intrinsic - premium;
          return dte <= 0 ? atExpiry : atExpiry + tv * (1 - intrinsic / (Math.abs(p - S) + 10));
        },
      };
    case "short-call":
      return {
        label: "Short Call",
        strikes: [S],
        premiums: [premium],
        breakevens: [S + premium],
        maxProfit: `$${premium.toFixed(2)}`,
        maxLoss: "Unlimited",
        pnl: (p, dte) => {
          const intrinsic = Math.max(0, p - S);
          const tv = premium * timeDecayFactor(dte, totalDte);
          const atExpiry = premium - intrinsic;
          return dte <= 0 ? atExpiry : atExpiry - tv * (1 - intrinsic / (Math.abs(p - S) + 10));
        },
      };
    case "short-put":
      return {
        label: "Short Put",
        strikes: [S],
        premiums: [premium],
        breakevens: [S - premium],
        maxProfit: `$${premium.toFixed(2)}`,
        maxLoss: `$${(S - premium).toFixed(2)}`,
        pnl: (p, dte) => {
          const intrinsic = Math.max(0, S - p);
          const tv = premium * timeDecayFactor(dte, totalDte);
          const atExpiry = premium - intrinsic;
          return dte <= 0 ? atExpiry : atExpiry - tv * (1 - intrinsic / (Math.abs(p - S) + 10));
        },
      };
    case "covered-call":
      return {
        label: "Covered Call",
        strikes: [105],
        premiums: [3],
        breakevens: [S - 3],
        maxProfit: `$${(105 - S + 3).toFixed(2)}`,
        maxLoss: `$${(S - 3).toFixed(2)}`,
        pnl: (p, dte) => {
          const stockPnl = p - S;
          const callIntrinsic = Math.max(0, p - 105);
          const tv = 3 * timeDecayFactor(dte, totalDte);
          const callPnl = dte <= 0 ? 3 - callIntrinsic : 3 - callIntrinsic + tv * 0.3;
          return stockPnl + callPnl;
        },
      };
    case "csp":
      return {
        label: "Cash-Secured Put",
        strikes: [95],
        premiums: [3],
        breakevens: [95 - 3],
        maxProfit: `$${3..toFixed(2)}`,
        maxLoss: `$${(95 - 3).toFixed(2)}`,
        pnl: (p, dte) => {
          const intrinsic = Math.max(0, 95 - p);
          const tv = 3 * timeDecayFactor(dte, totalDte);
          const atExpiry = 3 - intrinsic;
          return dte <= 0 ? atExpiry : atExpiry - tv * 0.3;
        },
      };
    case "pmcc": {
      const longStrike = 80;
      const shortStrike = 105;
      const longPrem = 22;
      const shortPrem = 3;
      const netDebit = longPrem - shortPrem;
      return {
        label: "Poor Man's Covered Call",
        strikes: [longStrike, shortStrike],
        premiums: [longPrem, shortPrem],
        breakevens: [longStrike + netDebit],
        maxProfit: `$${(shortStrike - longStrike - netDebit).toFixed(2)}`,
        maxLoss: `$${netDebit.toFixed(2)}`,
        pnl: (p, dte) => {
          const longIntrinsic = Math.max(0, p - longStrike);
          const shortIntrinsic = Math.max(0, p - shortStrike);
          const longTv = longPrem * timeDecayFactor(dte, totalDte) * 0.5;
          if (dte <= 0) return longIntrinsic - shortIntrinsic + shortPrem - longPrem;
          return longIntrinsic + longTv - longPrem + shortPrem - shortIntrinsic;
        },
      };
    }
    case "iron-condor": {
      const putBuy = 90;
      const putSell = 95;
      const callSell = 105;
      const callBuy = 110;
      const credit = 2.5;
      return {
        label: "Iron Condor",
        strikes: [putBuy, putSell, callSell, callBuy],
        premiums: [credit],
        breakevens: [putSell - credit, callSell + credit],
        maxProfit: `$${credit.toFixed(2)}`,
        maxLoss: `$${(putSell - putBuy - credit).toFixed(2)}`,
        pnl: (p, dte) => {
          let pnlVal: number;
          if (dte <= 0) {
            const putSpreadLoss = Math.max(0, putSell - p) - Math.max(0, putBuy - p);
            const callSpreadLoss = Math.max(0, p - callSell) - Math.max(0, p - callBuy);
            pnlVal = credit - putSpreadLoss - callSpreadLoss;
          } else {
            const tf = timeDecayFactor(dte, totalDte);
            const dist = Math.min(Math.abs(p - putSell), Math.abs(p - callSell));
            const curve = credit * (1 - tf * 0.5) * Math.exp(-0.003 * dist * dist);
            const putSpreadLoss = Math.max(0, putSell - p) - Math.max(0, putBuy - p);
            const callSpreadLoss = Math.max(0, p - callSell) - Math.max(0, p - callBuy);
            pnlVal = credit - (putSpreadLoss + callSpreadLoss) * (1 - tf * 0.3) + curve * 0.3;
          }
          return pnlVal;
        },
      };
    }
    case "straddle":
      return {
        label: "Long Straddle",
        strikes: [S],
        premiums: [premium * 2],
        breakevens: [S - premium * 2, S + premium * 2],
        maxProfit: "Unlimited",
        maxLoss: `$${(premium * 2).toFixed(2)}`,
        pnl: (p, dte) => {
          const callIntrinsic = Math.max(0, p - S);
          const putIntrinsic = Math.max(0, S - p);
          const totalPrem = premium * 2;
          const tv = totalPrem * timeDecayFactor(dte, totalDte);
          const atExpiry = callIntrinsic + putIntrinsic - totalPrem;
          return dte <= 0 ? atExpiry : atExpiry + tv * 0.5;
        },
      };
  }
}

interface PnLDiagramProps {
  strategy?: StrategyType;
}

export default function PnLDiagram({ strategy = "long-call" }: PnLDiagramProps) {
  const [dte, setDte] = useState(90);
  const config = getStrategy(strategy);

  const W = 340;
  const H = 220;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 50;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const priceRange = { min: 70, max: 130 };

  const points = useMemo(() => {
    const pts: { x: number; price: number; pnl: number }[] = [];
    for (let i = 0; i <= 200; i++) {
      const price = priceRange.min + (i / 200) * (priceRange.max - priceRange.min);
      const pnl = config.pnl(price, dte);
      const x = PAD_L + (i / 200) * plotW;
      pts.push({ x, price, pnl });
    }
    return pts;
  }, [strategy, dte, config]);

  const pnlValues = points.map((p) => p.pnl);
  const minPnl = Math.min(...pnlValues, -2);
  const maxPnl = Math.max(...pnlValues, 2);
  const pnlRange = maxPnl - minPnl || 1;
  const pnlPadding = pnlRange * 0.1;

  const scaleY = (pnl: number) =>
    PAD_T + plotH - ((pnl - minPnl + pnlPadding) / (pnlRange + pnlPadding * 2)) * plotH;

  const zeroY = scaleY(0);

  const scaledPoints = points.map((p) => ({
    ...p,
    y: scaleY(p.pnl),
  }));

  const pathD = scaledPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Fill areas
  const greenPath: string[] = [];
  const redPath: string[] = [];

  scaledPoints.forEach((p) => {
    if (p.y <= zeroY) {
      greenPath.push(`${p.x},${p.y}`);
    }
    if (p.y >= zeroY) {
      redPath.push(`${p.x},${p.y}`);
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900">{config.label} P&L</h3>
        <span className="text-xs font-mono text-gray-500">{dte} DTE</span>
      </div>

      {/* Key stats */}
      <div className="flex gap-3 text-xs mb-3">
        <div>
          <span className="text-gray-500">Max Profit: </span>
          <span className="text-green-600 font-semibold">{config.maxProfit}</span>
        </div>
        <div>
          <span className="text-gray-500">Max Loss: </span>
          <span className="text-red-600 font-semibold">{config.maxLoss}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Zero line */}
        <line x1={PAD_L} y1={zeroY} x2={PAD_L + plotW} y2={zeroY} stroke="#d1d5db" strokeWidth="1" />
        <text x={PAD_L - 4} y={zeroY + 3} textAnchor="end" fontSize="8" fill="#9ca3af">$0</text>

        {/* Green fill (above zero) */}
        {scaledPoints.length > 0 && (
          <clipPath id={`green-clip-${strategy}`}>
            <rect x={PAD_L} y={PAD_T} width={plotW} height={zeroY - PAD_T} />
          </clipPath>
        )}
        <path
          d={`${pathD} L${scaledPoints[scaledPoints.length - 1].x},${zeroY} L${scaledPoints[0].x},${zeroY} Z`}
          fill="rgba(34,197,94,0.12)"
          clipPath={`url(#green-clip-${strategy})`}
        />

        {/* Red fill (below zero) */}
        {scaledPoints.length > 0 && (
          <clipPath id={`red-clip-${strategy}`}>
            <rect x={PAD_L} y={zeroY} width={plotW} height={PAD_T + plotH - zeroY} />
          </clipPath>
        )}
        <path
          d={`${pathD} L${scaledPoints[scaledPoints.length - 1].x},${zeroY} L${scaledPoints[0].x},${zeroY} Z`}
          fill="rgba(239,68,68,0.12)"
          clipPath={`url(#red-clip-${strategy})`}
        />

        {/* P&L curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Strike lines */}
        {config.strikes.map((strike, i) => {
          const x = PAD_L + ((strike - priceRange.min) / (priceRange.max - priceRange.min)) * plotW;
          return (
            <g key={i}>
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + plotH} stroke="#6b7280" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={x} y={H - 22} textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="600">
                K=${strike}
              </text>
            </g>
          );
        })}

        {/* Breakeven markers */}
        {config.breakevens.map((be, i) => {
          if (be < priceRange.min || be > priceRange.max) return null;
          const x = PAD_L + ((be - priceRange.min) / (priceRange.max - priceRange.min)) * plotW;
          return (
            <g key={`be-${i}`}>
              <circle cx={x} cy={zeroY} r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
              <text x={x} y={zeroY - 8} textAnchor="middle" fontSize="7" fill="#3b82f6" fontWeight="bold">
                BE ${be.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {[75, 85, 95, 105, 115, 125].map((price) => {
          const x = PAD_L + ((price - priceRange.min) / (priceRange.max - priceRange.min)) * plotW;
          return (
            <text key={price} x={x} y={H - 10} textAnchor="middle" fontSize="8" fill="#9ca3af">
              ${price}
            </text>
          );
        })}
        <text x={PAD_L + plotW / 2} y={H - 1} textAnchor="middle" fontSize="8" fill="#6b7280">
          Stock Price at Expiry
        </text>
      </svg>

      <div className="mt-3">
        <InteractiveSlider
          min={0}
          max={90}
          value={dte}
          onChange={setDte}
          label="Days to Expiry"
          unit="d"
          step={1}
        />
      </div>
    </div>
  );
}
