/**
 * Trading Desk pipeline.
 *
 * Composes the pieces that already exist into the order that actually matters:
 * the market regime sets the scan's guardrails BEFORE anything is scanned, the
 * debate ledger is built from data alone, the risk desk sizes the survivors
 * against one shared pot of capital, and only then — optionally — does an LLM
 * get asked to explain what the numbers already decided.
 *
 * Two LLM calls, maximum: one batched news read, one batched narration. With
 * `useAI: false` there are zero, and every section below still renders.
 * A failing sub-step lands in `errors[]`; it never takes the page down.
 */

import { scanForCSPs, type CSPHunterCandidate, type CSPScanConfig } from "@/lib/options/csp-scanner";
import { getMarketRegime, regimeToScanConfig, type RegimeReading } from "@/lib/market/regime";
import { runRiskDesk, fetchExistingHoldings, type PortfolioRisk, type CandidateRisk } from "@/lib/risk/desk";
import { buildLedger, type DebateLedger } from "@/lib/debate/ledger";
import { narrateDebates, type DebateNarration } from "@/lib/debate/narrate";
import { analyzeNewsBatch, type NewsSentiment } from "@/lib/news/sentiment";
import { computeLessons, computeLessonsFromRows, formatLessonsBlock, type Lessons } from "@/lib/reflection/lessons";
import { analyzeTechnicals, type TechnicalSignals } from "@/lib/analysis/technicals";
import { getQuotes } from "@/lib/market/yahoo";

export type DeskCandidate = CSPHunterCandidate & {
  ledger: DebateLedger;
  narration?: DebateNarration;
  news?: NewsSentiment;
  riskVerdict?: CandidateRisk;
};

export type DeskResult = {
  regime: RegimeReading;
  candidates: DeskCandidate[];
  risk: PortfolioRisk;
  lessons: Lessons;
  lessonsBlock: string;
  generatedAt: string;
  aiUsed: boolean;
  /** Were the owner's real brokerage positions folded into the risk math? */
  holdingsIncluded: boolean;
  tokens: { input: number; output: number; calls: number };
  errors: string[];
};

export type RunDeskOptions = {
  capital?: number;
  tickers?: string[];
  useAI?: boolean;
  userId?: string;
  /**
   * Fold the owner's real brokerage positions into the risk math. Off by
   * default: `fetchExistingHoldings()` is not user-scoped, so the symbols and
   * market values it returns are the account owner's and must never reach an
   * unauthenticated caller. The route sets this from the Supabase session.
   */
  includeHoldings?: boolean;
};

const DEFAULT_CAPITAL = 100_000;
const MAX_CANDIDATES = 12;
const TECHNICALS_CONCURRENCY = 5;

/** A reading that lets the page render when the regime read itself blows up. */
function fallbackRegime(): RegimeReading {
  return {
    regime: "NEUTRAL",
    score: 0,
    asOf: new Date().toISOString(),
    signals: [
      {
        label: "Market regime",
        value: "unavailable",
        contribution: 0,
        note: "Could not read the market this run, so the scan uses its neutral defaults.",
      },
    ],
    volatility: { source: "realized", level: 18 },
    breadthPct: 50,
    recommended: {
      minDelta: 0.15,
      maxDelta: 0.25,
      minDTE: 7,
      maxDTE: 21,
      minAROC: 10,
      stance: "Market read unavailable — running neutral guardrails: deltas of 0.15-0.25 (delta is roughly the chance the stock finishes below your strike and you get assigned the shares), 7-21 days to expiration, and at least 10% annualized on the cash you set aside. Keep normal size.",
    },
  };
}

function emptyRisk(capital: number): PortfolioRisk {
  return {
    totalCollateralIfAllAssigned: 0,
    approvedCollateral: 0,
    capital,
    assignmentCapacityPct: 0,
    sectorExposure: [],
    correlatedClusters: [],
    earningsClusters: [],
    worstCase: { drawdownPct: 0, note: "No approved positions to stress." },
    verdicts: [],
    summary: "No candidates to review.",
  };
}

/** One candidate per symbol, richest first, capped. */
function dedupeTop(candidates: CSPHunterCandidate[], max: number): CSPHunterCandidate[] {
  const best = new Map<string, CSPHunterCandidate>();
  for (const c of candidates) {
    const key = c.symbol.toUpperCase();
    const existing = best.get(key);
    if (!existing || c.juiciness > existing.juiciness) best.set(key, c);
  }
  return [...best.values()].sort((a, b) => b.juiciness - a.juiciness).slice(0, max);
}

async function technicalsFor(
  candidates: CSPHunterCandidate[],
  errors: string[]
): Promise<Map<string, TechnicalSignals>> {
  const out = new Map<string, TechnicalSignals>();
  const symbols = candidates.map((c) => c.symbol.toUpperCase());
  if (symbols.length === 0) return out;

  let quotes: Awaited<ReturnType<typeof getQuotes>> = [];
  try {
    quotes = await getQuotes(symbols);
  } catch (e) {
    errors.push(`Quotes for technicals failed: ${String(e)}`);
    return out;
  }
  const bySymbol = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));

  for (let i = 0; i < symbols.length; i += TECHNICALS_CONCURRENCY) {
    const batch = symbols.slice(i, i + TECHNICALS_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (sym) => {
        const quote = bySymbol.get(sym);
        if (!quote) return null;
        return analyzeTechnicals(sym, quote);
      })
    );
    settled.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value) out.set(batch[idx], r.value);
      else if (r.status === "rejected") errors.push(`Technicals for ${batch[idx]} failed: ${String(r.reason)}`);
    });
  }

  return out;
}

export async function runDesk(opts: RunDeskOptions = {}): Promise<DeskResult> {
  const capital = opts.capital && opts.capital > 0 ? opts.capital : DEFAULT_CAPITAL;
  const useAI = opts.useAI !== false;
  const includeHoldings = opts.includeHoldings === true;
  const errors: string[] = [];
  const generatedAt = new Date().toISOString();

  // 1. Regime first — it decides how tight the scan is allowed to be.
  let regime: RegimeReading;
  try {
    regime = await getMarketRegime();
  } catch (e) {
    errors.push(`Market regime read failed: ${String(e)}`);
    regime = fallbackRegime();
  }

  // 2. Scan under the regime's guardrails.
  const scanConfig: CSPScanConfig = {
    ...regimeToScanConfig(regime),
    capital,
    ...(opts.tickers && opts.tickers.length > 0 ? { tickers: opts.tickers } : {}),
  };

  let rawCandidates: CSPHunterCandidate[] = [];
  try {
    const scan = await scanForCSPs(scanConfig);
    rawCandidates = scan.candidates;
    if (scan.errors.length > 0) errors.push(...scan.errors.slice(0, 5));
  } catch (e) {
    errors.push(`CSP scan failed: ${String(e)}`);
  }

  // 3. One row per symbol, the richest ones only.
  const shortlist = dedupeTop(rawCandidates, MAX_CANDIDATES);
  const symbols = shortlist.map((c) => c.symbol.toUpperCase());

  // 4. News (one batched LLM call) and technicals, together.
  const [newsResult, technicals, holdings] = await Promise.all([
    symbols.length > 0
      ? analyzeNewsBatch(symbols, { userId: opts.userId, skipLLM: !useAI }).catch((e) => {
          errors.push(`News sentiment failed: ${String(e)}`);
          return new Map<string, NewsSentiment>();
        })
      : Promise.resolve(new Map<string, NewsSentiment>()),
    technicalsFor(shortlist, errors),
    includeHoldings ? fetchExistingHoldings().catch(() => []) : Promise.resolve([]),
  ]);

  const newsAttempted = useAI && symbols.length > 0;
  const newsUsedLLM = [...newsResult.values()].some((n) => n.source === "llm");

  // 5. Ledgers — deterministic, zero tokens, always runs.
  const ledgers = shortlist.map((c) =>
    buildLedger({
      symbol: c.symbol.toUpperCase(),
      technicals: technicals.get(c.symbol.toUpperCase()) ?? null,
      candidate: c,
      news: newsResult.get(c.symbol.toUpperCase()),
    })
  );

  // 6. Risk desk — sizes every candidate against one shared pot of capital.
  let risk: PortfolioRisk;
  try {
    risk = await runRiskDesk(shortlist, { capital, regime, existingHoldings: holdings });
  } catch (e) {
    errors.push(`Risk desk failed: ${String(e)}`);
    risk = emptyRisk(capital);
  }
  const verdictBySymbol = new Map(risk.verdicts.map((v) => [v.symbol.toUpperCase(), v]));

  // 7. Track record.
  let lessons: Lessons;
  let lessonsBlock = "";
  try {
    lessons = await computeLessons();
    lessonsBlock = formatLessonsBlock(lessons);
  } catch (e) {
    errors.push(`Lessons failed: ${String(e)}`);
    // An empty-history read is still a valid, renderable Lessons object.
    lessons = computeLessonsFromRows([]);
    lessonsBlock = "";
  }

  // 8. Narration — the only step that can be skipped without losing a fact.
  let narrationBySymbol = new Map<string, DebateNarration>();
  const tokens = { input: 0, output: 0, calls: 0 };
  let narrated = false;

  if (useAI && ledgers.length > 0) {
    try {
      const result = await narrateDebates(ledgers, { userId: opts.userId, maxSymbols: MAX_CANDIDATES });
      if (result) {
        narrated = true;
        narrationBySymbol = new Map(result.narrations.map((n) => [n.symbol.toUpperCase(), n]));
        tokens.input += result.inputTokens;
        tokens.output += result.outputTokens;
        tokens.calls += 1;
      } else {
        errors.push("Debate narration returned nothing — showing the ledgers on their own.");
      }
    } catch (e) {
      errors.push(`Debate narration failed: ${String(e)}`);
    }
  }

  // The news module does not report its token usage, so only the call is counted.
  if (newsAttempted && newsUsedLLM) tokens.calls += 1;

  const candidates: DeskCandidate[] = shortlist.map((c, i) => {
    const key = c.symbol.toUpperCase();
    return {
      ...c,
      ledger: ledgers[i],
      narration: narrationBySymbol.get(key),
      news: newsResult.get(key),
      riskVerdict: verdictBySymbol.get(key),
    };
  });

  return {
    regime,
    candidates,
    risk,
    lessons,
    lessonsBlock,
    generatedAt,
    aiUsed: narrated || (newsAttempted && newsUsedLLM),
    holdingsIncluded: includeHoldings,
    tokens,
    errors,
  };
}
