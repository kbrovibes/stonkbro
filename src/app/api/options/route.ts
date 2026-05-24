import { NextResponse } from "next/server";
import { getQuote, getAllOptionsChains, OptionContract } from "@/lib/market/yahoo";
import { findPMCCSetups } from "@/lib/options/pmcc";

export type CSPCandidate = {
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  premium: number;
  annualizedReturn: number;
  probOTM: number;
  openInterest: number;
  volume: number;
  distanceFromPrice: number;
  reasoning: string;
};

export type CCCandidate = {
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  premium: number;
  annualizedReturn: number;
  probOTM: number;
  openInterest: number;
  volume: number;
  distanceFromPrice: number;
  reasoning: string;
};

function estimateProbOTM(strike: number, price: number, dte: number, type: "put" | "call"): number {
  const moneyness = type === "put" ? price / strike : strike / price;
  const timeAdj = Math.sqrt(dte / 365);
  // Rough estimate: further OTM + less time = higher prob OTM
  const base = Math.min(0.95, Math.max(0.30, 0.5 + (moneyness - 1) * 3 / timeAdj));
  return Math.round(base * 100);
}

function findCSPCandidates(price: number, puts: OptionContract[]): CSPCandidate[] {
  const minStrike = price * 0.85; // 15% below
  const maxStrike = price * 0.95; // 5% below

  const candidates = puts
    .filter(
      (p) =>
        p.dte >= 20 &&
        p.dte <= 45 &&
        p.strike >= minStrike &&
        p.strike <= maxStrike &&
        p.mid > 0.1 &&
        !p.inTheMoney &&
        p.openInterest >= 10
    )
    .map((p) => {
      const premium = p.mid * 100;
      const annualizedReturn = (p.mid / p.strike) * (365 / p.dte) * 100;
      const distPct = ((price - p.strike) / price) * 100;
      const probOTM = estimateProbOTM(p.strike, price, p.dte, "put");

      return {
        strike: p.strike,
        expiry: p.expiry,
        dte: p.dte,
        bid: p.bid,
        ask: p.ask,
        mid: p.mid,
        premium,
        annualizedReturn: Math.round(annualizedReturn * 10) / 10,
        probOTM,
        openInterest: p.openInterest,
        volume: p.volume,
        distanceFromPrice: Math.round(distPct * 10) / 10,
        reasoning: `Sell at ${distPct.toFixed(0)}% below price, collect $${p.mid.toFixed(2)} (${annualizedReturn.toFixed(1)}% ann.) in ${p.dte}d`,
      };
    })
    .sort((a, b) => b.annualizedReturn - a.annualizedReturn);

  return candidates.slice(0, 10);
}

function findCCCandidates(price: number, calls: OptionContract[]): CCCandidate[] {
  const minStrike = price * 1.03; // 3% above
  const maxStrike = price * 1.10; // 10% above

  const candidates = calls
    .filter(
      (c) =>
        c.dte >= 20 &&
        c.dte <= 45 &&
        c.strike >= minStrike &&
        c.strike <= maxStrike &&
        c.mid > 0.1 &&
        !c.inTheMoney &&
        c.openInterest >= 10
    )
    .map((c) => {
      const premium = c.mid * 100;
      const annualizedReturn = (c.mid / c.strike) * (365 / c.dte) * 100;
      const distPct = ((c.strike - price) / price) * 100;
      const probOTM = estimateProbOTM(c.strike, price, c.dte, "call");

      return {
        strike: c.strike,
        expiry: c.expiry,
        dte: c.dte,
        bid: c.bid,
        ask: c.ask,
        mid: c.mid,
        premium,
        annualizedReturn: Math.round(annualizedReturn * 10) / 10,
        probOTM,
        openInterest: c.openInterest,
        volume: c.volume,
        distanceFromPrice: Math.round(distPct * 10) / 10,
        reasoning: `Sell ${distPct.toFixed(0)}% above price, collect $${c.mid.toFixed(2)} (${annualizedReturn.toFixed(1)}% ann.) in ${c.dte}d`,
      };
    })
    .sort((a, b) => b.annualizedReturn - a.annualizedReturn);

  return candidates.slice(0, 10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const [quote, chain] = await Promise.all([
      getQuote(symbol),
      getAllOptionsChains(symbol),
    ]);

    if (!quote) {
      return NextResponse.json({ error: `Quote not found for ${symbol}` }, { status: 404 });
    }

    if (!chain) {
      return NextResponse.json({ error: `Options chain not found for ${symbol}` }, { status: 404 });
    }

    const pmccSetups = findPMCCSetups(symbol, quote.price, chain.calls);
    const cspCandidates = findCSPCandidates(quote.price, chain.puts);
    const ccCandidates = findCCCandidates(quote.price, chain.calls);

    return NextResponse.json({
      quote,
      expirations: chain.expirations,
      pmccSetups: pmccSetups.slice(0, 6),
      cspCandidates,
      ccCandidates,
      callCount: chain.calls.length,
      putCount: chain.puts.length,
    });
  } catch (e) {
    console.error("Options error:", e);
    return NextResponse.json({ error: "Failed to fetch options data" }, { status: 500 });
  }
}
