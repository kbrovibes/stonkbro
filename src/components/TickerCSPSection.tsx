"use client";

import { useState, useEffect } from "react";

type CSPPick = {
  strike: number;
  expiry: string;
  dte: number;
  mid: number;
  delta: number;
  iv: number;
  aroc: number;
  premium: number;
  collateralRequired: number;
  contractsAt100k: number;
  totalPremium: number;
  distanceFromPrice: number;
  nearSupport: boolean;
  supportLevel: number;
  rsi: number;
  earningsWithinDTE: boolean;
  daysToEarnings: number | null;
  juiciness: number;
  priority: "high" | "medium" | "low";
  catalyst: string;
};

export default function TickerCSPSection({ symbol }: { symbol: string }) {
  const [picks, setPicks] = useState<CSPPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/csp-hunter/ticker?symbol=${symbol}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.candidates) setPicks(data.candidates);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-2">Cash Secured Puts</h3>
        <p className="text-xs text-stone-400 dark:text-text-faint animate-pulse">Scanning options chains...</p>
      </div>
    );
  }

  if (picks.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-2">Cash Secured Puts</h3>
        <p className="text-xs text-stone-400 dark:text-text-faint">No qualifying CSP candidates for {symbol} right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text">Cash Secured Puts</h3>
        <p className="text-xs text-stone-400 dark:text-text-faint mt-0.5">Top opportunities · 7-45 DTE · $100K capital</p>
      </div>

      <div className="divide-y divide-stone-100 dark:divide-border-subtle">
        {picks.map((p) => (
          <CSPPickCard key={`${p.strike}-${p.expiry}`} pick={p} />
        ))}
      </div>
    </div>
  );
}

function CSPPickCard({ pick: p }: { pick: CSPPick }) {
  const [open, setOpen] = useState(false);
  const priorityColor = p.priority === "high" ? "bg-emerald-500" : p.priority === "medium" ? "bg-amber-500" : "bg-stone-400";

  return (
    <div className="px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-surface-muted transition" onClick={() => setOpen(!open)}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${priorityColor}`} />
          <span className="text-sm font-semibold text-stone-900 dark:text-text">${p.strike} Put</span>
          <span className="text-xs text-stone-400 dark:text-text-faint">{p.expiry.slice(5)} · {p.dte}d</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-emerald-600 dark:text-gain">{p.aroc}%</span>
          <span className="text-xs text-stone-400 dark:text-text-faint ml-1">AROC</span>
        </div>
      </div>

      {/* Catalyst */}
      <p className="text-xs text-stone-500 dark:text-text-subtle mt-1 leading-snug italic">{p.catalyst}</p>

      {/* Quick stats */}
      <div className="flex gap-3 mt-1.5 text-xs text-stone-400 dark:text-text-faint">
        <span>${p.mid.toFixed(2)} mid</span>
        <span>Δ{p.delta.toFixed(2)}</span>
        <span>{p.distanceFromPrice}% OTM</span>
        <span>IV {(p.iv * 100).toFixed(0)}%</span>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-border-subtle space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-text-subtle">
            <div>Premium per contract: <span className="text-stone-900 dark:text-text font-medium">${p.premium.toFixed(0)}</span></div>
            <div>Collateral: <span className="text-stone-900 dark:text-text font-medium">${p.collateralRequired.toLocaleString()}</span></div>
            <div>Contracts @ $100K: <span className="text-stone-900 dark:text-text font-medium">{p.contractsAt100k}</span></div>
            <div>Total premium: <span className="text-emerald-600 dark:text-gain font-medium">${p.totalPremium.toLocaleString()}</span></div>
            <div>RSI: <span className="text-stone-900 dark:text-text font-medium">{p.rsi}</span></div>
            <div>Juiciness: <span className="text-stone-900 dark:text-text font-medium">{p.juiciness}/100</span></div>
            {p.nearSupport && <div className="col-span-2 text-emerald-600 dark:text-gain">Strike near support at ${p.supportLevel.toFixed(2)}</div>}
            {p.earningsWithinDTE && <div className="col-span-2 text-amber-600 dark:text-amber-300">⚠ Earnings in {p.daysToEarnings}d — within DTE window</div>}
          </div>

          {/* Technical reasoning */}
          <div className="pt-2 border-t border-stone-100 dark:border-border-subtle">
            <p className="text-[11px] font-semibold text-stone-600 dark:text-text-muted uppercase tracking-wider mb-1">Why this setup works</p>
            <p className="text-xs text-stone-500 dark:text-text-subtle leading-relaxed">
              {buildTechnicalReasoning(p)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function buildTechnicalReasoning(p: CSPPick): string {
  const parts: string[] = [];

  // Delta explanation
  if (p.delta <= 0.20) {
    parts.push(`Low delta (${p.delta.toFixed(2)}) means ~${(p.delta * 100).toFixed(0)}% probability of going in-the-money — strong odds of expiring worthless.`);
  } else if (p.delta <= 0.30) {
    parts.push(`Moderate delta (${p.delta.toFixed(2)}) balances premium income with ~${((1 - p.delta) * 100).toFixed(0)}% probability of profit.`);
  } else {
    parts.push(`Higher delta (${p.delta.toFixed(2)}) captures more premium but carries ~${(p.delta * 100).toFixed(0)}% assignment risk.`);
  }

  // IV context
  if (p.iv > 0.5) {
    parts.push(`IV at ${(p.iv * 100).toFixed(0)}% is elevated — you're selling expensive insurance, which is exactly when CSPs pay best.`);
  } else if (p.iv > 0.3) {
    parts.push(`IV at ${(p.iv * 100).toFixed(0)}% provides healthy premium without excessive underlying volatility.`);
  } else {
    parts.push(`IV at ${(p.iv * 100).toFixed(0)}% is relatively low — premium is modest but the stock is also calmer.`);
  }

  // Support
  if (p.nearSupport) {
    parts.push(`Strike at $${p.strike} sits near the $${p.supportLevel.toFixed(0)} support level, adding a technical floor if price pulls back.`);
  }

  // RSI
  if (p.rsi < 35) {
    parts.push(`RSI at ${p.rsi} signals oversold — the stock is likely near a bounce, making put assignment less probable.`);
  } else if (p.rsi > 65) {
    parts.push(`RSI at ${p.rsi} is elevated — watch for a pullback, though the ${p.distanceFromPrice}% OTM cushion helps.`);
  }

  // Earnings risk
  if (p.earningsWithinDTE) {
    parts.push(`Earnings fall within the DTE window — expect a binary move. Premium is inflated, but so is the risk of a gap down through your strike.`);
  }

  // Capital efficiency
  parts.push(`At $${p.collateralRequired.toLocaleString()} collateral per contract, ${p.contractsAt100k} contracts capture $${p.totalPremium.toLocaleString()} in premium for a ${p.aroc}% annualized return.`);

  return parts.join(" ");
}
