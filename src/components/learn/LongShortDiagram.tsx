"use client";

import { useState } from "react";

type Tab = "long-stock" | "short-stock" | "long-call" | "long-put";

interface ScenarioData {
  upLabel: string;
  upPct: string;
  upColor: "green" | "red";
  downLabel: string;
  downPct: string;
  downColor: "green" | "red";
  note?: string;
}

const SCENARIOS: Record<Tab, ScenarioData> = {
  "long-stock": {
    upLabel: "+$17.50/share",
    upPct: "+10%",
    upColor: "green",
    downLabel: "-$17.50/share",
    downPct: "-10%",
    downColor: "red",
  },
  "short-stock": {
    upLabel: "-$17.50/share",
    upPct: "-10% (loss)",
    upColor: "red",
    downLabel: "+$17.50/share",
    downPct: "+10% (gain)",
    downColor: "green",
  },
  "long-call": {
    upLabel: "$10 - $3.50 = +$6.50",
    upPct: "+186% on premium",
    upColor: "green",
    downLabel: "-$3.50 (max loss)",
    downPct: "-100% on premium",
    downColor: "red",
    note: "$175 strike call, $3.50 premium",
  },
  "long-put": {
    upLabel: "-$3.00 (max loss)",
    upPct: "-100% on premium",
    upColor: "red",
    downLabel: "$10 - $3.00 = +$7.00",
    downPct: "+233% on premium",
    downColor: "green",
    note: "$175 strike put, $3.00 premium",
  },
};

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "long-stock", label: "Long Stock" },
  { id: "short-stock", label: "Short Stock" },
  { id: "long-call", label: "Long Call" },
  { id: "long-put", label: "Long Put" },
];

const colorClasses = {
  green: {
    text: "text-emerald-600 dark:text-gain",
    pct: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-gain-bg border-emerald-200 dark:border-gain-border",
    badge: "bg-emerald-100 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong",
  },
  red: {
    text: "text-red-600",
    pct: "text-red-500 dark:text-loss",
    bg: "bg-red-50 dark:bg-loss-bg border-red-200 dark:border-loss-border",
    badge: "bg-red-100 dark:bg-loss-bg text-red-700 dark:text-loss-strong",
  },
};

// Simple arrow SVG showing price movement direction
function PriceArrow({ direction }: { direction: "up" | "down" }) {
  const isUp = direction === "up";
  return (
    <svg viewBox="0 0 80 56" className="w-full h-14" preserveAspectRatio="xMidYMid meet">
      {/* Starting price dot */}
      <circle cx="12" cy="28" r="4" fill="var(--text-subtle)" />
      <text x="12" y="48" textAnchor="middle" fontSize="9" fill="var(--text-faint)">$175</text>

      {/* Arrow line */}
      <line
        x1="16" y1="28"
        x2={isUp ? "60" : "60"}
        y2={isUp ? "10" : "46"}
        stroke={isUp ? "#10b981" : "#ef4444"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Arrowhead */}
      {isUp ? (
        <polygon points="60,4 55,14 65,14" fill="var(--gain)" />
      ) : (
        <polygon points="60,52 55,42 65,42" fill="var(--loss)" />
      )}

      {/* End price */}
      <circle cx="60" cy={isUp ? "10" : "46"} r="4" fill={isUp ? "#10b981" : "#ef4444"} />
      <text x="60" y={isUp ? "28" : "36"} textAnchor="middle" fontSize="9" fill={isUp ? "#059669" : "#dc2626"}>
        {isUp ? "$192.50" : "$157.50"}
      </text>
    </svg>
  );
}

export default function LongShortDiagram(_props: Record<string, unknown>) {
  const [activeTab, setActiveTab] = useState<Tab>("long-stock");
  const scenario = SCENARIOS[activeTab];
  const upColors = colorClasses[scenario.upColor];
  const downColors = colorClasses[scenario.downColor];

  return (
    <div className="bg-white dark:bg-surface-elevated rounded-xl shadow-sm border border-gray-100 dark:border-border-subtle p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-text">Long vs Short — AAPL Example</h3>
        <p className="text-xs text-gray-500 dark:text-text-subtle mt-0.5">Starting price: $175.00 &nbsp;|&nbsp; Move: ±10%</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-surface-muted rounded-lg">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === id
                ? "bg-white dark:bg-surface-elevated text-gray-900 dark:text-text shadow-sm"
                : "text-gray-500 dark:text-text-subtle hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Note for options tabs */}
      {scenario.note && (
        <p className="text-xs text-gray-400 dark:text-text-faint text-center mb-3 italic">{scenario.note}</p>
      )}

      {/* Scenario panels */}
      <div className="grid grid-cols-2 gap-3">
        {/* Up scenario */}
        <div className={`rounded-lg border p-3 ${upColors.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-text-muted">AAPL goes UP</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${upColors.badge}`}>+10%</span>
          </div>
          <PriceArrow direction="up" />
          <div className="mt-2 text-center">
            <p className={`text-sm font-bold ${upColors.text}`}>{scenario.upLabel}</p>
            <p className={`text-xs font-semibold mt-0.5 ${upColors.pct}`}>{scenario.upPct}</p>
          </div>
        </div>

        {/* Down scenario */}
        <div className={`rounded-lg border p-3 ${downColors.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-text-muted">AAPL goes DOWN</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${downColors.badge}`}>-10%</span>
          </div>
          <PriceArrow direction="down" />
          <div className="mt-2 text-center">
            <p className={`text-sm font-bold ${downColors.text}`}>{scenario.downLabel}</p>
            <p className={`text-xs font-semibold mt-0.5 ${downColors.pct}`}>{scenario.downPct}</p>
          </div>
        </div>
      </div>

      {/* Quick reference row */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-center">
        <div className="rounded-md bg-gray-50 border border-gray-200 dark:border-border-default px-2 py-1.5">
          <span className="font-semibold text-gray-700 dark:text-text-muted">You profit when</span>
          <br />
          <span className={activeTab.startsWith("long") ? "text-emerald-600 dark:text-gain font-bold" : "text-red-600 dark:text-loss font-bold"}>
            {activeTab === "long-stock" && "price rises"}
            {activeTab === "short-stock" && "price falls"}
            {activeTab === "long-call" && "price rises past $178.50"}
            {activeTab === "long-put" && "price falls past $172.00"}
          </span>
        </div>
        <div className="rounded-md bg-gray-50 border border-gray-200 dark:border-border-default px-2 py-1.5">
          <span className="font-semibold text-gray-700 dark:text-text-muted">Max loss</span>
          <br />
          <span className="text-red-600 dark:text-loss font-bold">
            {activeTab === "long-stock" && "100% (to $0)"}
            {activeTab === "short-stock" && "Unlimited"}
            {activeTab === "long-call" && "$3.50/contract"}
            {activeTab === "long-put" && "$3.00/contract"}
          </span>
        </div>
      </div>

      {/* Key insight callout */}
      <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 px-3 py-2">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium text-center">
          Key insight: Long = you want it to go up. Short = you want it to go down.
        </p>
      </div>
    </div>
  );
}
