/**
 * Options Flow Scanner — unusual activity detection.
 *
 * Analyzes options chains for signals of unusual activity:
 * - High volume relative to open interest (blocks)
 * - Put/call volume ratio extremes (sentiment)
 * - Large OI concentrations at specific strikes (walls)
 * - Volume spikes in OTM options (speculative bets)
 *
 * Works with existing Tradier options chain data.
 */

import type { OptionContract, OptionsChain, QuoteData } from "@/lib/market/types";

export type FlowSignal = {
  symbol: string;
  type: "large_block" | "oi_spike" | "pcr_extreme" | "otm_speculative" | "volume_wall";
  direction: "bullish" | "bearish" | "neutral";
  description: string;
  strike: number;
  expiry: string;
  volume: number;
  openInterest: number;
  significance: number; // 0-100
};

export type FlowSummary = {
  symbol: string;
  price: number;
  signals: FlowSignal[];
  putCallRatio: number | null;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
  sentiment: "bullish" | "bearish" | "neutral";
  activityScore: number; // 0-100 composite unusual activity score
};

// ---------------------------------------------------------------------------
// Analysis functions
// ---------------------------------------------------------------------------

function detectLargeBlocks(
  contracts: OptionContract[],
  symbol: string,
  contractType: "call" | "put"
): FlowSignal[] {
  const signals: FlowSignal[] = [];

  for (const c of contracts) {
    if (c.volume <= 0 || c.openInterest <= 0) continue;

    const volToOI = c.volume / c.openInterest;

    // Volume > 3x open interest = unusual block activity
    if (volToOI >= 3 && c.volume >= 500) {
      const direction = contractType === "call" ? "bullish" : "bearish";
      signals.push({
        symbol,
        type: "large_block",
        direction,
        description: `${contractType.toUpperCase()} $${c.strike} ${c.expiry}: ${c.volume.toLocaleString()} vol vs ${c.openInterest.toLocaleString()} OI (${volToOI.toFixed(1)}x)`,
        strike: c.strike,
        expiry: c.expiry,
        volume: c.volume,
        openInterest: c.openInterest,
        significance: Math.min(100, Math.round(volToOI * 15 + (c.volume / 1000) * 5)),
      });
    }
  }

  return signals;
}

function detectOIConcentrations(
  contracts: OptionContract[],
  symbol: string,
  contractType: "call" | "put",
  totalOI: number
): FlowSignal[] {
  const signals: FlowSignal[] = [];
  if (totalOI <= 0) return signals;

  for (const c of contracts) {
    if (c.openInterest <= 0) continue;

    const oiPct = c.openInterest / totalOI;

    // Single strike has > 15% of total OI = wall
    if (oiPct >= 0.15 && c.openInterest >= 5000) {
      signals.push({
        symbol,
        type: "volume_wall",
        direction: contractType === "call" ? "bearish" : "bullish", // call wall = resistance, put wall = support
        description: `${contractType.toUpperCase()} wall at $${c.strike}: ${c.openInterest.toLocaleString()} OI (${(oiPct * 100).toFixed(0)}% of total)`,
        strike: c.strike,
        expiry: c.expiry,
        volume: c.volume,
        openInterest: c.openInterest,
        significance: Math.min(100, Math.round(oiPct * 200 + (c.openInterest / 10000) * 10)),
      });
    }
  }

  return signals;
}

function detectOTMSpeculative(
  contracts: OptionContract[],
  symbol: string,
  price: number,
  contractType: "call" | "put"
): FlowSignal[] {
  const signals: FlowSignal[] = [];

  for (const c of contracts) {
    if (c.volume < 1000 || c.inTheMoney) continue;

    // How far OTM?
    const otmPct = contractType === "call"
      ? ((c.strike - price) / price) * 100
      : ((price - c.strike) / price) * 100;

    // > 10% OTM with high volume = speculative bet
    if (otmPct >= 10 && c.volume >= 2000) {
      signals.push({
        symbol,
        type: "otm_speculative",
        direction: contractType === "call" ? "bullish" : "bearish",
        description: `${contractType.toUpperCase()} $${c.strike} (${otmPct.toFixed(0)}% OTM): ${c.volume.toLocaleString()} vol — speculative bet`,
        strike: c.strike,
        expiry: c.expiry,
        volume: c.volume,
        openInterest: c.openInterest,
        significance: Math.min(100, Math.round(otmPct * 2 + (c.volume / 1000) * 10)),
      });
    }
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function analyzeFlow(
  symbol: string,
  quote: QuoteData,
  chain: OptionsChain
): FlowSummary {
  const totalCallVolume = chain.calls.reduce((s, c) => s + c.volume, 0);
  const totalPutVolume = chain.puts.reduce((s, c) => s + c.volume, 0);
  const totalCallOI = chain.calls.reduce((s, c) => s + c.openInterest, 0);
  const totalPutOI = chain.puts.reduce((s, c) => s + c.openInterest, 0);

  const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : null;

  // Collect all signals
  const signals: FlowSignal[] = [
    ...detectLargeBlocks(chain.calls, symbol, "call"),
    ...detectLargeBlocks(chain.puts, symbol, "put"),
    ...detectOIConcentrations(chain.calls, symbol, "call", totalCallOI),
    ...detectOIConcentrations(chain.puts, symbol, "put", totalPutOI),
    ...detectOTMSpeculative(chain.calls, symbol, quote.price, "call"),
    ...detectOTMSpeculative(chain.puts, symbol, quote.price, "put"),
  ];

  // PCR extreme signal
  if (putCallRatio !== null) {
    if (putCallRatio >= 2.0) {
      signals.push({
        symbol,
        type: "pcr_extreme",
        direction: "bearish",
        description: `Extreme put/call ratio: ${putCallRatio.toFixed(2)} — heavy put buying`,
        strike: 0,
        expiry: "",
        volume: totalPutVolume,
        openInterest: totalPutOI,
        significance: Math.min(100, Math.round(putCallRatio * 25)),
      });
    } else if (putCallRatio <= 0.3 && totalCallVolume >= 5000) {
      signals.push({
        symbol,
        type: "pcr_extreme",
        direction: "bullish",
        description: `Very low put/call ratio: ${putCallRatio.toFixed(2)} — heavy call buying`,
        strike: 0,
        expiry: "",
        volume: totalCallVolume,
        openInterest: totalCallOI,
        significance: Math.min(100, Math.round((1 / putCallRatio) * 15)),
      });
    }
  }

  // Sort by significance
  signals.sort((a, b) => b.significance - a.significance);

  // Composite activity score
  const topSignals = signals.slice(0, 5);
  const activityScore = topSignals.length > 0
    ? Math.min(100, Math.round(topSignals.reduce((s, sig) => s + sig.significance, 0) / topSignals.length))
    : 0;

  // Overall sentiment
  const bullish = signals.filter((s) => s.direction === "bullish").length;
  const bearish = signals.filter((s) => s.direction === "bearish").length;
  const sentiment: "bullish" | "bearish" | "neutral" =
    bullish > bearish + 1 ? "bullish" : bearish > bullish + 1 ? "bearish" : "neutral";

  return {
    symbol,
    price: quote.price,
    signals: signals.slice(0, 10), // top 10
    putCallRatio,
    totalCallVolume,
    totalPutVolume,
    totalCallOI,
    totalPutOI,
    sentiment,
    activityScore,
  };
}
