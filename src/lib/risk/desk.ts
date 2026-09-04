/**
 * Risk Desk
 *
 * Sits between the CSP scanner and the user and answers one question per
 * candidate: how many of these can you actually afford to be assigned?
 *
 * The scanner sizes every candidate as if it were the only trade you were
 * making. Acting on ten of those rows at once is the classic put-seller
 * blowup — every strike is fine in isolation and ruinous together. This module
 * is deterministic: same candidates and capital in, same verdicts out.
 */

import type { CSPHunterCandidate } from "@/lib/options/csp-scanner";
import type { RegimeReading } from "@/lib/market/regime";
import { getSectorForTicker } from "@/lib/market/sectors";

export type RiskVerdict = "APPROVE" | "SIZE_DOWN" | "REJECT";

export type RiskFlag =
  | "WIDE_SPREAD"
  | "UNTRADEABLE_SPREAD"
  | "THIN_OPEN_INTEREST"
  | "SINGLE_NAME_CONCENTRATION"
  | "SECTOR_CONCENTRATION"
  | "CLUSTER_CONCENTRATION"
  | "EARNINGS_CLUSTER"
  | "EARNINGS_BEFORE_EXPIRY"
  | "REGIME_DELTA"
  | "EXISTING_EXPOSURE"
  | "ASSIGNMENT_CAPACITY";

/** Exposure you already carry, from a brokerage sync or entered by hand. */
export type Holding = {
  symbol: string;
  /** Dollars at risk: market value for shares, strike * 100 * contracts for a short put. */
  exposure: number;
  kind: "equity" | "short_put";
};

export type CandidateRisk = {
  symbol: string;
  strike: number;
  expiry: string;
  verdict: RiskVerdict;
  maxContracts: number;
  requestedContracts: number;
  reasons: string[];
  flags: RiskFlag[];
};

export type PortfolioRisk = {
  totalCollateralIfAllAssigned: number;
  approvedCollateral: number;
  capital: number;
  assignmentCapacityPct: number; // >100% = you cannot cover it
  sectorExposure: { sector: string; pct: number; symbols: string[] }[];
  correlatedClusters: { name: string; symbols: string[]; pct: number }[];
  earningsClusters: { week: string; symbols: string[] }[];
  worstCase: { drawdownPct: number; note: string };
  verdicts: CandidateRisk[];
  summary: string;
};

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const SINGLE_NAME_CAP = 0.20;
const SECTOR_CAP = 0.35;
const CLUSTER_CAP = 0.40;
const WIDE_SPREAD_PCT = 0.10;
const UNTRADEABLE_SPREAD_PCT = 0.20;
const MIN_OPEN_INTEREST = 100;
const EARNINGS_CLUSTER_SIZE = 3;
const STRESS_DROP = 0.20;

/**
 * Names that move as one. The sector label says NVDA and MU are different
 * businesses; the tape says they gap together on the same headline, which is
 * the exposure that actually matters when every put is short at once.
 */
const CORRELATED_CLUSTERS: { name: string; symbols: string[] }[] = [
  { name: "Semiconductors", symbols: ["NVDA", "AMD", "MU", "AVGO", "MRVL", "TSM", "ARM", "SMCI", "INTC", "QCOM", "ANET", "CRDO"] },
  { name: "Nuclear & power", symbols: ["OKLO", "SMR", "NNE", "LEU", "CCJ", "UEC", "VST", "CEG"] },
  { name: "Quantum computing", symbols: ["IONQ", "RGTI", "QBTS", "QUBT"] },
  { name: "Fintech", symbols: ["SOFI", "COIN", "HOOD", "AFRM", "UPST"] },
  { name: "Megacap tech", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "META"] },
];

const CLUSTER_BY_SYMBOL = new Map<string, string>();
for (const c of CORRELATED_CLUSTERS) {
  for (const s of c.symbols) CLUSTER_BY_SYMBOL.set(s, c.name);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function pct(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Monday of the calendar week containing `iso`, as a plain label. */
function weekLabel(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - offset);
  return `week of ${d.toISOString().split("T")[0]}`;
}

type WorkItem = {
  c: CSPHunterCandidate;
  collateralPer: number;
  requested: number;
  allowed: number;
  reasons: string[];
  flags: RiskFlag[];
  sector: string;
  cluster: string | null;
  /** Index into `reasons` of the check that actually drove size to zero. */
  killIndex: number | null;
};

/**
 * Best-effort read of live brokerage holdings. Returns [] whenever SnapTrade is
 * not configured, is down, or has nothing for this account — the desk is
 * expected to run on the candidate list alone.
 */
export async function fetchExistingHoldings(): Promise<Holding[]> {
  try {
    const { getPortfolio } = await import("@/lib/snaptrade/client");
    const portfolio = await getPortfolio();
    const holdings: Holding[] = [];

    for (const p of portfolio.positions ?? []) {
      if (p.is_option || !p.symbol || !(p.market_value > 0)) continue;
      holdings.push({ symbol: p.symbol.toUpperCase(), exposure: p.market_value, kind: "equity" });
    }

    for (const o of portfolio.options ?? []) {
      if (o.option_type?.toUpperCase() !== "PUT" || o.units >= 0) continue;
      holdings.push({
        symbol: o.underlying.toUpperCase(),
        exposure: o.strike * 100 * Math.abs(o.units),
        kind: "short_put",
      });
    }

    return holdings;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Desk
// ---------------------------------------------------------------------------

export async function runRiskDesk(
  candidates: CSPHunterCandidate[],
  opts: { capital: number; existingHoldings?: Holding[]; regime?: RegimeReading }
): Promise<PortfolioRisk> {
  const capital = opts.capital > 0 ? opts.capital : 100_000;
  const holdings = opts.existingHoldings ?? [];
  const regime = opts.regime;

  const items: WorkItem[] = candidates.map((c) => {
    const collateralPer = c.collateralRequired > 0 ? c.collateralRequired : c.strike * 100;
    const sector = getSectorForTicker(c.symbol)?.name ?? "Unclassified";
    return {
      c,
      collateralPer,
      requested: Math.max(1, Math.floor(capital / collateralPer)),
      allowed: Math.max(1, Math.floor(capital / collateralPer)),
      reasons: [],
      flags: [],
      sector,
      cluster: CLUSTER_BY_SYMBOL.get(c.symbol.toUpperCase()) ?? null,
      killIndex: null,
    };
  });

  // --- Pass 1: hard rejects -------------------------------------------------
  for (const it of items) {
    const { bid, ask, mid } = it.c;
    const spread = ask - bid;
    const spreadPct = mid > 0 ? spread / mid : Infinity;

    if (!(mid > 0) || spreadPct > UNTRADEABLE_SPREAD_PCT) {
      it.allowed = 0;
      it.flags.push("UNTRADEABLE_SPREAD");
      it.reasons.push(
        `The gap between what buyers bid ($${bid.toFixed(2)}) and what sellers ask ($${ask.toFixed(2)}) is ${mid > 0 ? `${Math.round(spreadPct * 100)}%` : "wider than"} of the contract's value — you would give up most of the premium just getting filled.`
      );
      it.killIndex = it.reasons.length - 1;
    }
  }

  // --- Pass 2: liquidity and regime size-downs -----------------------------
  for (const it of items) {
    if (it.allowed === 0) continue;
    const spreadPct = it.c.mid > 0 ? (it.c.ask - it.c.bid) / it.c.mid : Infinity;

    if (spreadPct > WIDE_SPREAD_PCT) {
      it.allowed = Math.max(1, Math.floor(it.allowed / 2));
      it.flags.push("WIDE_SPREAD");
      it.reasons.push(
        `The bid-ask gap is ${Math.round(spreadPct * 100)}% of the contract's value, so half size until you see it fill at a fair price.`
      );
    }

    if (it.c.openInterest < MIN_OPEN_INTEREST) {
      it.allowed = Math.max(1, Math.floor(it.allowed / 2));
      it.flags.push("THIN_OPEN_INTEREST");
      it.reasons.push(
        `Only ${it.c.openInterest} of these contracts are open across the whole market, so closing early could be hard. Half size.`
      );
    }

    if (regime && Math.abs(it.c.delta) > regime.recommended.maxDelta) {
      it.allowed = Math.max(1, Math.floor(it.allowed / 2));
      it.flags.push("REGIME_DELTA");
      it.reasons.push(
        `Delta is ${Math.abs(it.c.delta).toFixed(2)} — roughly a ${Math.round(Math.abs(it.c.delta) * 100)}% chance you get assigned the shares — against a ${regime.regime.replace("_", "-").toLowerCase()} market where we cap that at ${regime.recommended.maxDelta.toFixed(2)}. Half size.`
      );
    }

    if (it.c.earningsWithinDTE) {
      it.flags.push("EARNINGS_BEFORE_EXPIRY");
      it.reasons.push(
        `Earnings land ${it.c.daysToEarnings !== null ? `in ${it.c.daysToEarnings} days, ` : ""}before this contract expires — one report can move the stock straight through your strike.`
      );
    }
  }

  // --- Pass 3: earnings clusters -------------------------------------------
  const earningsClusters: { week: string; symbols: string[] }[] = [];
  const byWeek = new Map<string, WorkItem[]>();
  for (const it of items) {
    if (it.allowed === 0 || !it.c.earningsDate || !it.c.earningsWithinDTE) continue;
    const wk = weekLabel(it.c.earningsDate);
    if (!wk) continue;
    const list = byWeek.get(wk) ?? [];
    list.push(it);
    byWeek.set(wk, list);
  }
  for (const [week, list] of [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (list.length < EARNINGS_CLUSTER_SIZE) continue;
    earningsClusters.push({ week, symbols: list.map((i) => i.c.symbol) });
    const ranked = [...list].sort((a, b) => b.c.juiciness - a.c.juiciness);
    ranked.forEach((it, idx) => {
      it.flags.push("EARNINGS_CLUSTER");
      if (idx < 2) {
        it.reasons.push(
          `${list.length} of these names report earnings in the same week (${week}) — a bad tape that week hits several positions at once. Not trimmed for the overlap, as one of the two strongest setups in that group.`
        );
      } else {
        it.allowed = Math.max(1, Math.floor(it.allowed / 2));
        it.reasons.push(
          `${list.length} of these names report earnings in the same week (${week}) and this is one of the weaker setups in that group. Half size.`
        );
      }
    });
  }

  // --- Pass 4: budgets ------------------------------------------------------
  // Existing exposure pre-consumes every budget it belongs to, so a name you
  // already own leaves less room for a new short put on it.
  const nameSpent = new Map<string, number>();
  const sectorSpent = new Map<string, number>();
  const clusterSpent = new Map<string, number>();
  const heldSymbols = new Set<string>();

  for (const h of holdings) {
    const sym = h.symbol.toUpperCase();
    heldSymbols.add(sym);
    nameSpent.set(sym, (nameSpent.get(sym) ?? 0) + h.exposure);
    const sec = getSectorForTicker(sym)?.name;
    if (sec) sectorSpent.set(sec, (sectorSpent.get(sec) ?? 0) + h.exposure);
    const clu = CLUSTER_BY_SYMBOL.get(sym);
    if (clu) clusterSpent.set(clu, (clusterSpent.get(clu) ?? 0) + h.exposure);
  }

  const nameBudget = capital * SINGLE_NAME_CAP;
  const sectorBudget = capital * SECTOR_CAP;
  const clusterBudget = capital * CLUSTER_CAP;
  let capitalRemaining = capital;

  const ordered = [...items].sort((a, b) => b.c.juiciness - a.c.juiciness);

  for (const it of ordered) {
    if (it.allowed === 0) continue;
    const sym = it.c.symbol.toUpperCase();
    const nameUsed = nameSpent.get(sym) ?? 0;

    const fit = (spent: number, budget: number) => Math.max(0, Math.floor((budget - spent) / it.collateralPer));
    const contracts = (n: number) => `${n} contract${n === 1 ? "" : "s"}`;

    // Every cap is evaluated, but only the one that actually binds is reported.
    // Naming all of them reads as a contradiction ("capped at 11 ... trimmed to 10").
    const caps: { fit: number; flag: RiskFlag; reason: string }[] = [
      {
        fit: fit(nameUsed, nameBudget),
        flag: "SINGLE_NAME_CONCENTRATION",
        reason:
          fit(nameUsed, nameBudget) > 0
            ? `Capped at ${contracts(fit(nameUsed, nameBudget))} so no single stock can tie up more than ${Math.round(SINGLE_NAME_CAP * 100)}% of your ${money(capital)}.`
            : it.collateralPer > nameBudget
              ? `Even one contract would tie up ${money(it.collateralPer)} if you were assigned — more than the ${money(nameBudget)} (${Math.round(SINGLE_NAME_CAP * 100)}% of your ${money(capital)}) any single stock is allowed. The strike is too expensive for this account.`
              : `The ${money(nameUsed)} already committed to ${sym} leaves under ${money(it.collateralPer)} of its ${money(nameBudget)} limit — not enough room for another contract.`,
      },
    ];

    if (it.sector !== "Unclassified") {
      const sectorFit = fit(sectorSpent.get(it.sector) ?? 0, sectorBudget);
      caps.push({
        fit: sectorFit,
        flag: "SECTOR_CONCENTRATION",
        reason:
          sectorFit === 0
            ? `${it.sector} has already used its ${Math.round(SECTOR_CAP * 100)}% share of your capital on higher-conviction picks, leaving no room for this one.`
            : `${it.sector} is already near the ${Math.round(SECTOR_CAP * 100)}% cap on one sector, so this is trimmed to ${contracts(sectorFit)}.`,
      });
    }

    if (it.cluster) {
      const clusterFit = fit(clusterSpent.get(it.cluster) ?? 0, clusterBudget);
      caps.push({
        fit: clusterFit,
        flag: "CLUSTER_CONCENTRATION",
        reason:
          clusterFit === 0
            ? `${it.cluster} names all move on the same news, and that basket has already used its ${Math.round(CLUSTER_CAP * 100)}% share of your capital — adding this would be the same bet twice.`
            : `${it.cluster} names move together on the same news, and that basket is at the ${Math.round(CLUSTER_CAP * 100)}% cap, so this is trimmed to ${contracts(clusterFit)}.`,
      });
    }

    const capitalFit = Math.max(0, Math.floor(capitalRemaining / it.collateralPer));
    caps.push({
      fit: capitalFit,
      flag: "ASSIGNMENT_CAPACITY",
      reason:
        capitalFit === 0
          ? `No cash left to cover assignment — the higher-conviction picks ahead of this one already claim your ${money(capital)}.`
          : `Only ${money(capitalRemaining)} of uncommitted cash left, which covers ${contracts(capitalFit)} if you were assigned the shares.`,
    });

    const binding = caps.reduce((tightest, c) => (c.fit < tightest.fit ? c : tightest));
    if (binding.fit < it.allowed) {
      it.allowed = binding.fit;
      it.flags.push(binding.flag);
      it.reasons.push(binding.reason);
      if (it.allowed === 0) it.killIndex = it.reasons.length - 1;
    }

    if (heldSymbols.has(sym)) {
      it.flags.push("EXISTING_EXPOSURE");
      it.reasons.push(
        `You already have ${money(nameUsed)} riding on ${sym}, which counts against the limit on any single name.`
      );
    }

    if (it.allowed > 0) {
      const spend = it.allowed * it.collateralPer;
      capitalRemaining -= spend;
      nameSpent.set(sym, nameUsed + spend);
      if (it.sector !== "Unclassified") sectorSpent.set(it.sector, (sectorSpent.get(it.sector) ?? 0) + spend);
      if (it.cluster) clusterSpent.set(it.cluster, (clusterSpent.get(it.cluster) ?? 0) + spend);
    }
  }

  // --- Results --------------------------------------------------------------
  const verdicts: CandidateRisk[] = items.map((it) => {
    const verdict: RiskVerdict = it.allowed === 0 ? "REJECT" : it.allowed < it.requested ? "SIZE_DOWN" : "APPROVE";
    // On a REJECT the reason that killed it leads; the size-down notes that ran
    // before it are still true but they are no longer the headline.
    const reasons =
      verdict === "REJECT" && it.killIndex !== null
        ? [it.reasons[it.killIndex], ...it.reasons.filter((_, i) => i !== it.killIndex)]
        : it.reasons;
    return {
      symbol: it.c.symbol,
      strike: it.c.strike,
      expiry: it.c.expiry,
      verdict,
      maxContracts: it.allowed,
      requestedContracts: it.requested,
      reasons,
      flags: it.flags,
    };
  });

  const totalCollateralIfAllAssigned = items.reduce((s, it) => s + it.requested * it.collateralPer, 0);
  const approvedCollateral = items.reduce((s, it) => s + it.allowed * it.collateralPer, 0);
  const holdingsExposure = holdings.reduce((s, h) => s + h.exposure, 0);

  const sectorSymbols = new Map<string, Set<string>>();
  const clusterSymbols = new Map<string, Set<string>>();
  for (const it of items) {
    if (it.allowed === 0) continue;
    if (it.sector !== "Unclassified") {
      const set = sectorSymbols.get(it.sector) ?? new Set<string>();
      set.add(it.c.symbol);
      sectorSymbols.set(it.sector, set);
    }
    if (it.cluster) {
      const set = clusterSymbols.get(it.cluster) ?? new Set<string>();
      set.add(it.c.symbol);
      clusterSymbols.set(it.cluster, set);
    }
  }
  for (const h of holdings) {
    const sec = getSectorForTicker(h.symbol)?.name;
    if (sec) {
      const set = sectorSymbols.get(sec) ?? new Set<string>();
      set.add(h.symbol.toUpperCase());
      sectorSymbols.set(sec, set);
    }
    const clu = CLUSTER_BY_SYMBOL.get(h.symbol.toUpperCase());
    if (clu) {
      const set = clusterSymbols.get(clu) ?? new Set<string>();
      set.add(h.symbol.toUpperCase());
      clusterSymbols.set(clu, set);
    }
  }

  const sectorExposure = [...sectorSymbols.keys()]
    .map((sector) => ({
      sector,
      pct: pct(((sectorSpent.get(sector) ?? 0) / capital) * 100),
      symbols: [...(sectorSymbols.get(sector) ?? [])].sort(),
    }))
    .filter((s) => s.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const correlatedClusters = [...clusterSymbols.keys()]
    .map((name) => ({
      name,
      pct: pct(((clusterSpent.get(name) ?? 0) / capital) * 100),
      symbols: [...(clusterSymbols.get(name) ?? [])].sort(),
    }))
    .filter((c) => c.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  // Worst case: every approved put gets assigned with the stock 20% below today.
  let stressLoss = 0;
  for (const it of items) {
    if (it.allowed === 0) continue;
    const stressed = it.c.currentPrice * (1 - STRESS_DROP);
    const perShare = Math.max(0, it.c.strike - stressed) - it.c.mid;
    if (perShare > 0) stressLoss += perShare * 100 * it.allowed;
  }
  const worstCase = {
    drawdownPct: pct((stressLoss / capital) * 100),
    note: `If every approved put were assigned with its stock ${Math.round(STRESS_DROP * 100)}% below today's price, you would be down about ${money(stressLoss)} on ${money(capital)} — before any premium you collect on the positions that survive.`,
  };

  // --- Summary --------------------------------------------------------------
  const rejected = verdicts.filter((v) => v.verdict === "REJECT").length;
  const sizedDown = verdicts.filter((v) => v.verdict === "SIZE_DOWN").length;
  const approved = verdicts.filter((v) => v.verdict !== "REJECT").length;
  const capacityPct = pct((totalCollateralIfAllAssigned / capital) * 100);

  const parts: string[] = [];
  if (items.length === 0) {
    parts.push("No candidates to review.");
  } else {
    parts.push(
      capacityPct > 100
        ? `If every one of these ${items.length} puts assigned at the size the scanner suggests, you would need ${money(totalCollateralIfAllAssigned)} but you have ${money(capital)} — I cut it back to ${money(approvedCollateral)} across ${approved} position${approved === 1 ? "" : "s"}.`
        : `All ${items.length} of these puts would need ${money(totalCollateralIfAllAssigned)} of your ${money(capital)} if they all assigned, which you can cover.`
    );
    if (rejected > 0) parts.push(`${rejected} ${rejected === 1 ? "was" : "were"} dropped outright.`);
    if (sizedDown > 0) parts.push(`${sizedDown} ${sizedDown === 1 ? "was" : "were"} cut to a smaller size.`);
  }

  const topCluster = correlatedClusters[0];
  if (topCluster && topCluster.pct >= 20) {
    parts.push(
      `${topCluster.symbols.length} of the survivors sit in the same ${topCluster.name} basket and move together — that is ${topCluster.pct}% of your capital riding on one story.`
    );
  }
  const topSector = sectorExposure[0];
  if (topSector && topSector.pct >= SECTOR_CAP * 100 * 0.85 && (!topCluster || topSector.sector !== topCluster.name)) {
    parts.push(`${topSector.sector} is at ${topSector.pct}% of capital, near the ${Math.round(SECTOR_CAP * 100)}% ceiling.`);
  }
  if (earningsClusters.length > 0) {
    const ec = earningsClusters[0];
    parts.push(`${ec.symbols.length} of them report earnings in the same week (${ec.week}), so one rough week hits several at once.`);
  }
  if (holdingsExposure > 0) {
    parts.push(`This counts the ${money(holdingsExposure)} you already have on across ${new Set(holdings.map((h) => h.symbol)).size} name${new Set(holdings.map((h) => h.symbol)).size === 1 ? "" : "s"}.`);
  }
  if (regime) {
    parts.push(`Sizing assumes a ${regime.regime.replace("_", "-").toLowerCase()} market, where we cap delta — roughly the chance of being assigned the shares — at ${regime.recommended.maxDelta.toFixed(2)}.`);
  }

  return {
    totalCollateralIfAllAssigned: Math.round(totalCollateralIfAllAssigned),
    approvedCollateral: Math.round(approvedCollateral),
    capital,
    assignmentCapacityPct: capacityPct,
    sectorExposure,
    correlatedClusters,
    earningsClusters,
    worstCase,
    verdicts,
    summary: parts.join(" "),
  };
}
