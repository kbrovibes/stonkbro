"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
};

type CSPCandidate = {
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  mid: number;
  premium: number;
  annualizedReturn: number;
  probOTM: number;
  openInterest: number;
  volume: number;
  distanceFromPrice: number;
  reasoning: string;
};

type CCCandidate = {
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  mid: number;
  premium: number;
  annualizedReturn: number;
  probOTM: number;
  openInterest: number;
  volume: number;
  distanceFromPrice: number;
  reasoning: string;
};

type PMCCSetup = {
  leaps: {
    strike: number;
    expiry: string;
    dte: number;
    mid: number;
    openInterest: number;
  };
  shortCall: {
    strike: number;
    expiry: string;
    dte: number;
    mid: number;
    openInterest: number;
  };
  grade: "A" | "B" | "C";
  monthlyReturnPct: number;
  annualizedReturn: number;
  netDebit: number;
  capitalRequired: number;
  capitalVs100Shares: number;
  leapsDelta: number;
  shortDelta: number;
  breakeven: number;
  signals: string[];
};

type OptionsData = {
  quote: Quote;
  cspCandidates: CSPCandidate[];
  ccCandidates: CCCandidate[];
  pmccSetups: PMCCSetup[];
  callCount: number;
  putCount: number;
};

function GradeBadge({ grade }: { grade: "A" | "B" | "C" }) {
  const colors = {
    A: "bg-emerald-50 text-emerald-700 border-emerald-200",
    B: "bg-sky-50 text-sky-700 border-sky-200",
    C: "bg-stone-100 text-stone-600 border-stone-200",
  };
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[grade]}`}
    >
      {grade}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-stone-900">{title}</h3>
        {count > 0 && (
          <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
      <p className="text-sm text-stone-400">{message}</p>
    </div>
  );
}

function CSPCard({ candidate }: { candidate: CSPCandidate }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-sm font-bold text-stone-900">
            ${candidate.strike.toFixed(0)} Put
          </span>
          <span className="text-xs text-stone-400 ml-2">
            {candidate.expiry} ({candidate.dte}d)
          </span>
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {candidate.annualizedReturn}% ann.
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Premium</p>
          <p className="text-sm font-semibold text-stone-900">${candidate.mid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Prob OTM</p>
          <p className="text-sm font-semibold text-stone-900">{candidate.probOTM}%</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Below Price</p>
          <p className="text-sm font-semibold text-stone-900">{candidate.distanceFromPrice}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-stone-500 border-t border-stone-100 pt-2">
        <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <span>{candidate.reasoning}</span>
      </div>
    </div>
  );
}

function CCCard({ candidate }: { candidate: CCCandidate }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-sm font-bold text-stone-900">
            ${candidate.strike.toFixed(0)} Call
          </span>
          <span className="text-xs text-stone-400 ml-2">
            {candidate.expiry} ({candidate.dte}d)
          </span>
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {candidate.annualizedReturn}% ann.
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Premium</p>
          <p className="text-sm font-semibold text-stone-900">${candidate.mid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Prob OTM</p>
          <p className="text-sm font-semibold text-stone-900">{candidate.probOTM}%</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Above Price</p>
          <p className="text-sm font-semibold text-stone-900">{candidate.distanceFromPrice}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-stone-500 border-t border-stone-100 pt-2">
        <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <span>{candidate.reasoning}</span>
      </div>
    </div>
  );
}

function PMCCCard({ setup }: { setup: PMCCSetup }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GradeBadge grade={setup.grade} />
          <span className="text-xs font-bold text-emerald-600">
            {setup.monthlyReturnPct.toFixed(1)}%/mo
          </span>
        </div>
        <span className="text-xs text-stone-400">
          {setup.annualizedReturn.toFixed(0)}% ann.
        </span>
      </div>

      {/* LEAPS leg */}
      <div className="mb-2">
        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Buy LEAPS</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-900">
            ${setup.leaps.strike.toFixed(0)} Call
          </span>
          <span className="text-xs text-stone-500">
            {setup.leaps.expiry} ({setup.leaps.dte}d) @ ${setup.leaps.mid.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Short call leg */}
      <div className="mb-3">
        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Sell Short Call</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-900">
            ${setup.shortCall.strike.toFixed(0)} Call
          </span>
          <span className="text-xs text-stone-500">
            {setup.shortCall.expiry} ({setup.shortCall.dte}d) @ ${setup.shortCall.mid.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 border-t border-stone-100 pt-3">
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Capital</p>
          <p className="text-sm font-semibold text-stone-900">
            ${(setup.capitalRequired / 1000).toFixed(1)}k
          </p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Breakeven</p>
          <p className="text-sm font-semibold text-stone-900">${setup.breakeven.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Savings</p>
          <p className="text-sm font-semibold text-stone-900">
            {setup.capitalVs100Shares.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Signals */}
      {setup.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {setup.signals.slice(0, 3).map((signal, i) => (
            <span
              key={i}
              className="text-[10px] font-medium bg-stone-50 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200"
            >
              {signal}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type Params = Promise<{ symbol: string }>;

export default function SuggestionsAnalysisPage({ params }: { params: Params }) {
  const { symbol } = use(params);
  const [data, setData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/options?symbol=${symbol.toUpperCase()}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch data");
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [symbol]);

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      {/* Back */}
      <Link
        href="/suggestions"
        className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Suggestions
      </Link>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">
            Analyzing {symbol.toUpperCase()} options...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm text-stone-700 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-stone-500 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Data loaded */}
      {data && !loading && (
        <>
          {/* Quote header */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-stone-900">
                  {data.quote.symbol}
                </h2>
                <span
                  className={`text-sm font-semibold ${
                    data.quote.changePct >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {data.quote.changePct >= 0 ? "+" : ""}
                  {data.quote.changePct.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-stone-900">
                  ${data.quote.price.toFixed(2)}
                </span>
                <span className="text-xs text-stone-400">
                  {data.callCount} calls / {data.putCount} puts
                </span>
              </div>
            </div>
          </div>

          {/* Section A: CSP */}
          <div>
            <SectionHeader
              title="Cash-Secured Puts"
              subtitle="Sell puts 5-15% below price to collect premium or buy shares at a discount"
              count={data.cspCandidates.length}
            />
            {data.cspCandidates.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.cspCandidates.slice(0, 3).map((c, i) => (
                  <CSPCard key={i} candidate={c} />
                ))}
              </div>
            ) : (
              <EmptyState message="No CSP candidates found in the 5-15% below, 20-45 DTE range" />
            )}
          </div>

          {/* Section B: CC */}
          <div>
            <SectionHeader
              title="Covered Calls"
              subtitle="Sell calls 3-10% above price to generate income on shares you own"
              count={data.ccCandidates.length}
            />
            {data.ccCandidates.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.ccCandidates.slice(0, 3).map((c, i) => (
                  <CCCard key={i} candidate={c} />
                ))}
              </div>
            ) : (
              <EmptyState message="No CC candidates found in the 3-10% above, 20-45 DTE range" />
            )}
          </div>

          {/* Section C: PMCC */}
          <div>
            <SectionHeader
              title="Poor Man's Covered Calls"
              subtitle="Buy deep ITM LEAPS and sell short calls against them for leveraged income"
              count={data.pmccSetups.length}
            />
            {data.pmccSetups.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.pmccSetups.slice(0, 3).map((s, i) => (
                  <PMCCCard key={i} setup={s} />
                ))}
              </div>
            ) : (
              <EmptyState message="No PMCC setups found with suitable LEAPS and short call combinations" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
