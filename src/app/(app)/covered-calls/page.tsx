import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getQuote, getOptionsChain, type QuoteData, type OptionContract } from "@/lib/market/yahoo";
import TickerLookup from "./TickerLookup";

export const dynamic = "force-dynamic";

type CoveredCallCandidate = {
  strike: number;
  expiry: string;
  dte: number;
  premium: number;
  annualizedReturn: number;
  probOTM: number;
  maxProfit: number;
  openInterest: number;
  iv: number;
};

type SymbolAnalysis = {
  symbol: string;
  sharesOwned: number;
  costBasis: number;
  currentPrice: number;
  candidates: CoveredCallCandidate[];
  error?: string;
};

function formatDollar(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function estimateProbOTM(currentPrice: number, strike: number, dte: number): number {
  // Distance-based proxy: further OTM = higher probability of staying OTM
  const distancePct = ((strike - currentPrice) / currentPrice) * 100;
  // Rough heuristic: adjust for time (more DTE = more uncertainty = lower prob)
  const timeFactor = Math.sqrt(dte / 30);
  const raw = 50 + (distancePct / timeFactor) * 10;
  return Math.min(99, Math.max(10, Math.round(raw)));
}

function findCoveredCallCandidates(
  quote: QuoteData,
  calls: OptionContract[],
  costBasis: number
): CoveredCallCandidate[] {
  const price = quote.price;
  const minStrike = price * 1.03; // 3% above current price
  const maxStrike = price * 1.10; // 10% above current price

  const filtered = calls.filter((c) => {
    if (c.strike < minStrike || c.strike > maxStrike) return false;
    if (c.dte < 20 || c.dte > 45) return false;
    if (c.mid <= 0.01) return false; // skip zero-premium contracts
    return true;
  });

  return filtered
    .map((c) => {
      const premium = c.mid;
      const annualizedReturn = (premium / c.strike) * (365 / c.dte) * 100;
      const probOTM = estimateProbOTM(price, c.strike, c.dte);
      // Max profit = (strike - cost basis) * 100 + premium * 100
      const maxProfit = (c.strike - costBasis) * 100 + premium * 100;

      return {
        strike: c.strike,
        expiry: c.expiry,
        dte: c.dte,
        premium,
        annualizedReturn,
        probOTM,
        maxProfit,
        openInterest: c.openInterest,
        iv: c.impliedVolatility,
      };
    })
    .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.strike - b.strike);
}

async function analyzeSymbol(
  symbol: string,
  sharesOwned: number,
  costBasis: number
): Promise<SymbolAnalysis> {
  const [quote, chain] = await Promise.all([
    getQuote(symbol),
    getOptionsChain(symbol),
  ]);

  if (!quote) {
    return { symbol, sharesOwned, costBasis, currentPrice: 0, candidates: [], error: "Could not fetch quote" };
  }

  if (!chain) {
    return { symbol, sharesOwned, costBasis, currentPrice: quote.price, candidates: [], error: "Could not fetch options chain" };
  }

  // We may need to fetch multiple expirations to cover 20-45 DTE range
  const now = new Date();
  const relevantExpirations = chain.expirations.filter((exp) => {
    const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return dte >= 20 && dte <= 45;
  });

  // Fetch each relevant expiration's chain
  let allCalls = chain.calls;
  if (relevantExpirations.length > 0) {
    const additionalChains = await Promise.allSettled(
      relevantExpirations.map((exp) => getOptionsChain(symbol, exp))
    );
    for (const result of additionalChains) {
      if (result.status === "fulfilled" && result.value) {
        allCalls = [...allCalls, ...result.value.calls];
      }
    }
  }

  // De-duplicate by strike+expiry
  const seen = new Set<string>();
  const uniqueCalls = allCalls.filter((c) => {
    const key = `${c.strike}-${c.expiry}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const candidates = findCoveredCallCandidates(quote, uniqueCalls, costBasis);

  return { symbol, sharesOwned, costBasis, currentPrice: quote.price, candidates };
}

export default async function CoveredCallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let positions: any[] = [];
  let fetchError = false;

  if (user) {
    try {
      positions = await getPositions(user.id);
    } catch {
      fetchError = true;
    }
  }

  // Filter to active positions with shares or LEAPS (Covered Call / PMCC strategies)
  const relevantPositions = positions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) =>
      p.status === "active" &&
      (p.strategy === "Covered Call" || p.strategy === "PMCC")
  );

  // Deduplicate symbols and gather share info
  const symbolMap = new Map<string, { sharesOwned: number; costBasis: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const pos of relevantPositions) {
    const symbol = pos.symbol;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legs = pos.position_legs ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shareLeg = legs.find((l: any) => l.type === "shares" || l.type === "leaps_call");
    const shares = shareLeg?.quantity ?? 100;
    const basis = shareLeg?.entry_price ?? 0;

    if (!symbolMap.has(symbol)) {
      symbolMap.set(symbol, { sharesOwned: shares, costBasis: basis });
    } else {
      const existing = symbolMap.get(symbol)!;
      symbolMap.set(symbol, {
        sharesOwned: existing.sharesOwned + shares,
        costBasis: (existing.costBasis + basis) / 2, // average
      });
    }
  }

  // Fetch live data for each symbol
  const analyses: SymbolAnalysis[] = [];
  if (symbolMap.size > 0) {
    const results = await Promise.allSettled(
      Array.from(symbolMap.entries()).map(([symbol, info]) =>
        analyzeSymbol(symbol, info.sharesOwned, info.costBasis)
      )
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        analyses.push(result.value);
      }
    }
  }

  const hasPositions = symbolMap.size > 0;

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <Link href="/" className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </Link>

      <div>
        <h2 className="text-lg font-extrabold text-stone-900">Covered Call Optimizer</h2>
        <p className="text-xs text-stone-500 mt-0.5">Compare strikes and expirations for your holdings</p>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Could not load positions. The database may not be set up yet.</p>
        </div>
      )}

      {!hasPositions && !fetchError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-500 mb-1">Add stock positions to see covered call recommendations</p>
          <p className="text-xs text-stone-400 mb-4">Track your shares or LEAPS to get optimized call-selling suggestions</p>
          <Link
            href="/positions/new"
            className="text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 px-4 py-2 rounded-lg transition-colors"
          >
            Add a position
          </Link>
        </div>
      )}

      {/* Position-based analyses */}
      {analyses.map((analysis) => (
        <div key={analysis.symbol} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/ticker/${analysis.symbol}`} className="text-sm font-bold text-stone-900 hover:underline">
                {analysis.symbol}
              </Link>
              <span className="text-xs text-stone-400">
                {analysis.sharesOwned} {analysis.sharesOwned === 1 ? "contract" : "shares"} @ {formatDollar(analysis.costBasis)}
              </span>
            </div>
            <span className="text-sm font-semibold text-stone-700">
              {analysis.currentPrice > 0 ? formatDollar(analysis.currentPrice) : "--"}
            </span>
          </div>

          {analysis.error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">{analysis.error}</p>
            </div>
          )}

          {analysis.candidates.length === 0 && !analysis.error && (
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-500">No covered call candidates found in the 3-10% OTM, 20-45 DTE range.</p>
            </div>
          )}

          {analysis.candidates.length > 0 && (
            <CandidateGrid candidates={analysis.candidates} />
          )}
        </div>
      ))}

      {/* Custom ticker lookup section */}
      <div className="border-t border-stone-200 pt-5 mt-1">
        <h3 className="text-sm font-bold text-stone-900 mb-1">Analyze any ticker</h3>
        <p className="text-xs text-stone-400 mb-3">Enter a symbol to see covered call candidates</p>
        <TickerLookup />
      </div>
    </div>
  );
}

function CandidateGrid({ candidates }: { candidates: CoveredCallCandidate[] }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
        <span>Strike</span>
        <span>Premium</span>
        <span>Prob OTM</span>
        <span>Ann. Ret.</span>
        <span>Max Profit</span>
      </div>

      {candidates.map((opt, i) => {
        const prevExpiry = i > 0 ? candidates[i - 1].expiry : null;
        const showDivider = prevExpiry && prevExpiry !== opt.expiry;

        return (
          <div key={`${opt.strike}-${opt.expiry}`}>
            {showDivider && <div className="border-t-2 border-stone-200" />}
            <div className="grid grid-cols-5 gap-1 px-3 py-2.5 border-b border-stone-50 hover:bg-stone-50/50 transition-colors items-center">
              <div>
                <span className="text-xs font-bold text-stone-900">${opt.strike}</span>
                <span className="text-[10px] text-stone-400 block">{opt.expiry} · {opt.dte}d</span>
              </div>
              <span className="text-xs font-semibold text-emerald-700">${opt.premium.toFixed(2)}</span>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${opt.probOTM >= 75 ? "bg-emerald-500" : opt.probOTM >= 60 ? "bg-amber-500" : "bg-red-400"}`}
                    style={{ width: `${opt.probOTM}%` }}
                  />
                </div>
                <span className="text-[10px] text-stone-500">{opt.probOTM}%</span>
              </div>
              <span className={`text-xs font-semibold ${opt.annualizedReturn >= 20 ? "text-emerald-700" : opt.annualizedReturn >= 10 ? "text-amber-600" : "text-stone-500"}`}>
                {opt.annualizedReturn.toFixed(1)}%
              </span>
              <span className="text-xs text-stone-700">{formatDollar(opt.maxProfit)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
