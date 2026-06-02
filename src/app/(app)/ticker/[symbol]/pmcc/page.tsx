import Link from "next/link";
import { getQuote, getAllOptionsChains, type OptionContract } from "@/lib/market/yahoo";
import { findPMCCSetups, type PMCCCandidate } from "@/lib/options/pmcc";

export const dynamic = "force-dynamic";

type Params = Promise<{ symbol: string }>;

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPct(n: number, decimals = 1) {
  return `${n.toFixed(decimals)}%`;
}

function BackLink({ symbol }: { symbol: string }) {
  return (
    <Link href={`/ticker/${symbol}`} className="flex items-center gap-1 text-sm text-stone-400 dark:text-text-faint hover:text-stone-600 w-fit">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
      {symbol}
    </Link>
  );
}

function GradeBadge({ grade }: { grade: "A" | "B" | "C" }) {
  const styles = {
    A: "bg-emerald-50 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong border-emerald-200 dark:border-gain-border",
    B: "bg-amber-50 text-amber-700 border-amber-200",
    C: "bg-stone-100 dark:bg-surface-muted text-stone-500 dark:text-text-subtle border-stone-200 dark:border-border-default",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[grade]}`}>
      {grade}
    </span>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" }) {
  const color = highlight === "green" ? "text-emerald-700 dark:text-gain-strong" : highlight === "red" ? "text-red-600 dark:text-loss" : "text-stone-900 dark:text-text";
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-border-subtle last:border-0">
      <span className="text-xs text-stone-500 dark:text-text-subtle">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function OptionLegCard({ label, leg, side, delta }: { label: string; leg: OptionContract; side: "long" | "short"; delta: number }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-stone-900 dark:text-text">{label}</h4>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          side === "long" ? "bg-sky-50 dark:bg-accent-bg text-sky-700 dark:text-accent-hover" : "bg-amber-50 text-amber-700"
        }`}>
          {side === "long" ? "BUY" : "SELL"}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div>
          <p className="text-lg font-bold text-stone-900 dark:text-text">${leg.strike.toFixed(2)}</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">Strike</p>
        </div>
        <div>
          <p className="text-lg font-bold text-stone-900 dark:text-text">{leg.expiry}</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">{leg.dte} DTE</p>
        </div>
        <div>
          <p className="text-lg font-bold text-stone-900 dark:text-text">${leg.mid.toFixed(2)}</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">Mid Price</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-stone-50 dark:bg-surface">
          <p className="text-xs font-semibold text-stone-700 dark:text-text-muted">{delta.toFixed(2)}</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">Delta</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-stone-50 dark:bg-surface">
          <p className="text-xs font-semibold text-stone-700 dark:text-text-muted">{(leg.impliedVolatility * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">IV</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-stone-50 dark:bg-surface">
          <p className="text-xs font-semibold text-stone-700 dark:text-text-muted">{leg.volume.toLocaleString()}</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">Vol</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-stone-50 dark:bg-surface">
          <p className="text-xs font-semibold text-stone-700 dark:text-text-muted">{leg.openInterest.toLocaleString()}</p>
          <p className="text-[10px] text-stone-400 dark:text-text-faint">OI</p>
        </div>
      </div>
    </div>
  );
}

function SetupCard({ setup, index }: { setup: PMCCCandidate; index: number }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text">Setup #{index + 1}</h3>
        <GradeBadge grade={setup.grade} />
        {setup.signals.length > 0 && (
          <span className="text-[10px] text-stone-400 dark:text-text-faint ml-auto">{setup.signals.length} signal{setup.signals.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-3">Trade Summary</h3>
        <StatRow label="Net Debit (cost)" value={formatCurrency(setup.netDebit * 100)} />
        <StatRow label="Capital Required" value={formatCurrency(setup.capitalRequired)} />
        <StatRow label="Capital vs 100 Shares" value={formatPct(setup.capitalVs100Shares) + " less"} highlight="green" />
        <StatRow label="Monthly Premium" value={formatCurrency(setup.monthlyPremium)} highlight="green" />
        <StatRow label="Monthly Return" value={formatPct(setup.monthlyReturnPct)} highlight="green" />
        <StatRow label="Annualized Return" value={formatPct(setup.annualizedReturn)} highlight="green" />
        <StatRow label="Breakeven" value={`$${setup.breakeven.toFixed(2)}`} />
        <StatRow label="Max Risk" value={formatCurrency(setup.maxRisk)} highlight="red" />
      </div>

      {/* LEAPS leg */}
      <OptionLegCard label="LEAPS (Long Call)" leg={setup.leaps} side="long" delta={setup.leapsDelta} />

      {/* Short call leg */}
      <OptionLegCard label="Short Call" leg={setup.shortCall} side="short" delta={setup.shortDelta} />

      {/* Signals */}
      {setup.signals.length > 0 && (
        <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-2">Signals</h3>
          <div className="flex flex-wrap gap-1.5">
            {setup.signals.map((sig, i) => (
              <span key={i} className="text-[10px] font-medium bg-stone-50 dark:bg-surface text-stone-600 dark:text-text-muted px-2 py-1 rounded-full">
                {sig}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk visual */}
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-3">Risk / Reward</h3>
        <div className="flex items-end gap-1 h-20">
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-red-100 dark:bg-loss-bg rounded-t" style={{ height: "60px" }} />
            <span className="text-[10px] text-red-600 dark:text-loss font-semibold">Max Risk</span>
            <span className="text-[10px] text-stone-500 dark:text-text-subtle">{formatCurrency(setup.maxRisk)}</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-emerald-100 dark:bg-gain-bg rounded-t" style={{ height: `${Math.min((setup.monthlyPremium / setup.maxRisk) * 400, 60)}px` }} />
            <span className="text-[10px] text-emerald-600 dark:text-gain font-semibold">Monthly</span>
            <span className="text-[10px] text-stone-500 dark:text-text-subtle">{formatCurrency(setup.monthlyPremium)}</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-emerald-200 rounded-t" style={{ height: `${Math.min((setup.monthlyPremium * 12 / setup.maxRisk) * 60, 60)}px` }} />
            <span className="text-[10px] text-emerald-700 dark:text-gain-strong font-semibold">Annual</span>
            <span className="text-[10px] text-stone-500 dark:text-text-subtle">{formatCurrency(setup.monthlyPremium * 12)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PMCCPage({ params }: { params: Params }) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const [quote, chain] = await Promise.all([
    getQuote(upper),
    getAllOptionsChains(upper),
  ]);

  if (!quote) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-5">
        <BackLink symbol={upper} />
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-text">Quote not found</h2>
          <p className="text-sm text-stone-500 dark:text-text-subtle mt-1">Could not fetch market data for {upper}.</p>
        </div>
      </div>
    );
  }

  if (!chain || chain.calls.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-5">
        <BackLink symbol={upper} />
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-text">No options data available</h2>
          <p className="text-sm text-stone-500 dark:text-text-subtle mt-1">Options chain not available for {upper}. This ticker may not have listed options.</p>
        </div>
      </div>
    );
  }

  const setups = findPMCCSetups(upper, quote.price, chain.calls);

  if (setups.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-5">
        <BackLink symbol={upper} />
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">PMCC Setup · {upper}</h2>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
            {quote.name} · {formatCurrency(quote.price)}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-text">No PMCC setups found</h2>
          <p className="text-sm text-stone-500 dark:text-text-subtle mt-1 max-w-xs">
            No viable Poor Man&apos;s Covered Call setups were found for {upper} at the current price of {formatCurrency(quote.price)}.
            This can happen when LEAPS are illiquid, spreads are too wide, or short-term premiums are too low.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-4">
      {/* Back */}
      <BackLink symbol={upper} />

      {/* Title */}
      <div>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">PMCC Setup · {upper}</h2>
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
          Poor Man&apos;s Covered Call — {quote.name} · {formatCurrency(quote.price)}
        </p>
      </div>

      {/* Setup count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500 dark:text-text-subtle">{setups.length} setup{setups.length !== 1 ? "s" : ""} found</span>
        <div className="flex gap-1">
          {(["A", "B", "C"] as const).map((g) => {
            const count = setups.filter((s) => s.grade === g).length;
            return count > 0 ? (
              <span key={g} className="text-[10px] text-stone-400 dark:text-text-faint">
                {count}{g}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* All setups */}
      {setups.map((setup, i) => (
        <div key={i}>
          {i > 0 && <hr className="border-stone-200 dark:border-border-default mb-4" />}
          <SetupCard setup={setup} index={i} />
        </div>
      ))}
    </div>
  );
}
