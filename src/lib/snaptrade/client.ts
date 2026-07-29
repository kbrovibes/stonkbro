/**
 * SnapTrade API client for stonkbro server-side use.
 * - Positions: getUserAccountPositions (per-account; bulk /holdings is deprecated 410)
 * - Options:   OptionsApi.listOptionHoldings
 * - Transactions: AccountInformationApi.getAccountActivities (returns {data, pagination})
 */

import {
  Configuration,
  AccountInformationApi,
  OptionsApi,
} from "snaptrade-typescript-sdk";

const config = new Configuration({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

const accountApi = new AccountInformationApi(config);
const optApi = new OptionsApi(config);

const UID = process.env.SNAPTRADE_USER_ID!;
const USEC = process.env.SNAPTRADE_USER_SECRET!;

export interface Account {
  id: string;
  name: string;
  number: string;
  institution: string;
}

export interface Position {
  symbol: string;
  description: string;
  units: number;
  price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  account_name: string;
  is_option: boolean;
}

export interface OptionPosition {
  underlying: string;
  option_type: string;
  strike: number;
  expiration: string;
  units: number;
  price: number;
  market_value: number;
  account_name: string;
  ticker: string;
}

export interface Balance {
  account_name: string;
  account_id: string;
  cash: number;
  buying_power: number;
  currency: string;
}

export interface PortfolioData {
  accounts: Account[];
  positions: Position[];
  options: OptionPosition[];
  balances: Balance[];
  summary: {
    total_market_value: number;
    total_cost_basis: number;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    total_positions: number;
    total_options: number;
    cash: number;
  };
  fetched_at: string;
}

export async function getAccounts(): Promise<Account[]> {
  const res = await accountApi.listUserAccounts({ userId: UID, userSecret: USEC });
  return ((res.data as any[]) ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    number: a.number,
    institution: a.institution_name ?? "Unknown",
  }));
}

export async function getPositions(accounts: Account[]): Promise<Position[]> {
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getUserAccountPositions({ userId: UID, userSecret: USEC, accountId: acct.id });
      const positions = (res.data as any[]) ?? [];
      return positions.map((p: any): Position => {
        const sym: string = p.symbol?.symbol?.symbol ?? p.symbol?.ticker ?? "UNKNOWN";
        const desc: string = p.symbol?.symbol?.description ?? p.symbol?.description ?? "";
        const units = Number(p.units ?? 0);
        const price = Number(p.price ?? 0);
        const avg = Number(p.average_purchase_price ?? 0);
        const mv = price * units;
        const cost = avg * Math.abs(units);
        const pnl = mv - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
        return {
          symbol: sym,
          description: desc,
          units,
          price,
          market_value: mv,
          cost_basis: cost,
          unrealized_pnl: pnl,
          unrealized_pnl_pct: pnlPct,
          account_name: acct.name,
          is_option: false,
        };
      });
    })
  );
  return all.flat().sort((a, b) => b.market_value - a.market_value);
}

export async function getOptionPositions(accounts: Account[]): Promise<OptionPosition[]> {
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await optApi.listOptionHoldings({ userId: UID, userSecret: USEC, accountId: acct.id });
      const opts = (res.data as any[]) ?? [];
      return opts.map((o: any): OptionPosition => {
        const sym = o.symbol?.option_symbol;
        const units = Number(o.units ?? 0);
        const price = Number(o.price ?? 0);
        const mv = price * units * 100;
        return {
          underlying: sym?.underlying_symbol?.symbol ?? "UNKNOWN",
          option_type: sym?.option_type ?? "UNKNOWN",
          strike: Number(sym?.strike_price ?? 0),
          expiration: sym?.expiration_date ?? "",
          units,
          price,
          market_value: mv,
          account_name: acct.name,
          ticker: sym?.ticker ?? "",
        };
      });
    })
  );
  return all.flat();
}

export async function getBalances(accounts: Account[]): Promise<Balance[]> {
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getUserAccountBalance({ userId: UID, userSecret: USEC, accountId: acct.id });
      const bals = (res.data as any[]) ?? [];
      return bals.map((b: any): Balance => ({
        account_name: acct.name,
        account_id: acct.id,
        cash: Number(b.cash ?? 0),
        buying_power: Number(b.buying_power ?? 0),
        currency: b.currency?.code ?? "USD",
      }));
    })
  );
  return all.flat();
}

export async function getPortfolio(): Promise<PortfolioData> {
  const accounts = await getAccounts();
  const [positions, options, balances] = await Promise.all([
    getPositions(accounts),
    getOptionPositions(accounts),
    getBalances(accounts),
  ]);

  const totalMV = positions.reduce((s, p) => s + p.market_value, 0);
  const totalCost = positions.reduce((s, p) => s + p.cost_basis, 0);
  const totalCash = balances.reduce((s, b) => s + b.cash, 0);

  return {
    accounts,
    positions,
    options,
    balances,
    summary: {
      total_market_value: totalMV,
      total_cost_basis: totalCost,
      unrealized_pnl: totalMV - totalCost,
      unrealized_pnl_pct: totalCost > 0 ? ((totalMV - totalCost) / totalCost) * 100 : 0,
      total_positions: positions.length,
      total_options: options.length,
      cash: totalCash,
    },
    fetched_at: new Date().toISOString(),
  };
}

export async function getTransactions(startDate = "2026-01-01") {
  const end = new Date().toISOString().split("T")[0];
  const start = startDate;
  const accounts = await getAccounts();
  const all = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getAccountActivities({
        userId: UID,
        userSecret: USEC,
        accountId: acct.id,
        startDate: start,
        endDate: end,
      });
      // Returns { data: [...], pagination: {...} }
      return ((res.data as any)?.data ?? res.data ?? []) as any[];
    })
  );
  return all.flat();
}

/**
 * Returns the RAW activity feed across all accounts — no filtering for
 * options or anything else. Used by the Time Machine to reconstruct
 * historical positions.
 *
 * SnapTrade caps each `getAccountActivities` call at 1000 records. To get
 * complete history we split the date range whenever a single chunk returns
 * exactly 1000 (cap hit), recurse on each half, then dedupe by id.
 */
const ACTIVITIES_CAP = 1000;

// SnapTrade throttles the activities endpoint per-minute, far tighter than
// the rest of the API. Pace split-level calls to stay under it, and if the
// SDK still exhausts its own retries (~15s of backoff — shorter than the
// rate-limit window), wait out a full minute once before giving up.
const ACTIVITIES_CALL_SPACING_MS = 2600;
const RATE_LIMIT_WINDOW_WAIT_MS = 65_000;

async function fetchActivitiesWindow(
  accountId: string,
  startISO: string,
  endISO: string,
  depth = 0,
): Promise<any[]> {
  if (depth > 0) await new Promise((r) => setTimeout(r, ACTIVITIES_CALL_SPACING_MS));
  let res;
  try {
    res = await accountApi.getAccountActivities({
      userId: UID, userSecret: USEC, accountId,
      startDate: startISO, endDate: endISO,
    });
  } catch (e) {
    if (!String(e).includes("429")) throw e;
    await new Promise((r) => setTimeout(r, RATE_LIMIT_WINDOW_WAIT_MS));
    res = await accountApi.getAccountActivities({
      userId: UID, userSecret: USEC, accountId,
      startDate: startISO, endDate: endISO,
    });
  }
  const chunk = ((res.data as any)?.data ?? res.data ?? []) as any[];

  // Hit the cap → split unless the window is already a single day or we've recursed too deep.
  if (chunk.length >= ACTIVITIES_CAP && depth < 10) {
    const startDt = Date.parse(startISO);
    const endDt = Date.parse(endISO);
    if (endDt - startDt > 86400_000) {
      const midDt = new Date((startDt + endDt) / 2).toISOString().slice(0, 10);
      // Sequential on purpose — parallel halves compound into a request burst
      // that exceeds SnapTrade's per-minute rate limit once history is deep
      // enough to need several split levels (SDK gives up after 3 retries).
      const left = await fetchActivitiesWindow(accountId, startISO, midDt, depth + 1);
      const right = await fetchActivitiesWindow(accountId, midDt, endISO, depth + 1);
      // Dedupe by id (midpoint day may appear in both halves)
      const seen = new Set<string>();
      const out: any[] = [];
      for (const t of [...left, ...right]) {
        const id = t?.id;
        if (!id || !seen.has(id)) {
          if (id) seen.add(id);
          out.push(t);
        }
      }
      return out;
    }
  }
  return chunk;
}

export async function getAllActivities(startDate = "2010-01-01"): Promise<any[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const accounts = await getAccounts();
  const all: any[] = [];
  for (const acct of accounts) {
    all.push(...(await fetchActivitiesWindow(acct.id, startDate, endDate)));
  }
  return all;
}

export interface OptionLeg {
  date: string;
  type: string;   // "BUY" | "SELL" | "OPTIONEXPIRATION" | "OPTIONASSIGNMENT"
  strike: number;
  expiry: string;
  units: number;  // signed: negative = short, positive = long
  price: number;
  amount: number; // positive = received, negative = paid
}

export interface OptionChain {
  underlying: string;
  option_type: string;  // "CALL" | "PUT"
  legs: OptionLeg[];
  net_pnl: number;
  status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED";
  start_date: string;
  end_date: string | null;
  open_units: number;
  roll_count: number;
  close_month: string | null; // "YYYY-MM" of end_date, for monthly grouping
  direction: "SELL" | "BUY"; // first action — SELL = short/income, BUY = long/directional
}

export async function getOptionChains(startDate = "2026-01-01"): Promise<OptionChain[]> {
  const end = new Date().toISOString().split("T")[0];
  const accounts = await getAccounts();

  // SnapTrade caps each getAccountActivities call at 1000 records, so use the
  // recursive window-splitter to make sure no option transactions are dropped
  // (especially old LEAPS opens that would otherwise fall off the back of a
  // single overflowing page).
  const allRaw = await Promise.all(
    accounts.map((acct) => fetchActivitiesWindow(acct.id, startDate, end))
  );

  type ParsedTx = {
    date: string; type: string; underlying: string; option_type: string;
    strike: number; expiry: string; units: number; price: number; amount: number;
  };

  const optionTxns: ParsedTx[] = allRaw.flat()
    .filter((t: any) => t.option_symbol != null)
    .map((t: any): ParsedTx => {
      const sym = t.option_symbol;
      return {
        date: t.trade_date ?? t.settlement_date ?? "",
        type: t.type ?? "",
        underlying: sym?.underlying_symbol?.symbol ?? "UNKNOWN",
        option_type: sym?.option_type ?? "UNKNOWN",
        strike: Number(sym?.strike_price ?? 0),
        expiry: sym?.expiration_date ?? "",
        units: Number(t.units ?? 0),
        price: Number(t.price ?? 0),
        amount: Number(t.amount ?? 0),
      };
    })
    // Sort by date; on ties, SELL/OPTIONEXPIRATION/OPTIONASSIGNMENT before BUY
    // so a same-day SELL→BUY-to-close chain doesn't get misclassified as BUY-first.
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      const rank = (t: string) => t === "BUY" ? 1 : 0;
      return rank(a.type) - rank(b.type);
    });

  // ── Step 1: per-contract chains (grouped by strike+expiry) ───────────────
  // Prevents mixing of simultaneous positions at different strikes/expiries.
  type ContractChain = {
    underlying: string; option_type: string; strike: number; expiry: string;
    legs: OptionLeg[]; net_pnl: number;
    status: "OPEN" | "CLOSED" | "EXPIRED" | "ASSIGNED";
    start_date: string; end_date: string | null; open_units: number;
    first_action: string; // "BUY" or "SELL"
  };

  const contractMap = new Map<string, ParsedTx[]>();
  for (const tx of optionTxns) {
    const key = `${tx.underlying}|${tx.option_type}|${tx.strike}|${tx.expiry}`;
    if (!contractMap.has(key)) contractMap.set(key, []);
    contractMap.get(key)!.push(tx);
  }

  const contractChains: ContractChain[] = [];

  for (const txns of contractMap.values()) {
    const { underlying, option_type, strike, expiry } = txns[0];
    let runningUnits = 0;
    let currentLegs: OptionLeg[] = [];

    const flush = (status: ContractChain["status"]) => {
      if (!currentLegs.length) return;
      const firstAction = currentLegs.find(l => l.type === "BUY" || l.type === "SELL")?.type ?? "SELL";
      contractChains.push({
        underlying, option_type, strike, expiry,
        legs: [...currentLegs],
        net_pnl: currentLegs.filter(l => l.type === "BUY" || l.type === "SELL").reduce((s, l) => s + l.amount, 0),
        status,
        start_date: currentLegs[0].date,
        end_date: status === "OPEN" ? null : currentLegs[currentLegs.length - 1].date,
        open_units: runningUnits,
        first_action: firstAction,
      });
      currentLegs = [];
    };

    for (const tx of txns) {
      const leg: OptionLeg = {
        date: tx.date, type: tx.type, strike: tx.strike, expiry: tx.expiry,
        units: tx.units, price: tx.price, amount: tx.amount,
      };
      currentLegs.push(leg);
      if (tx.type === "OPTIONEXPIRATION") { runningUnits = 0; flush("EXPIRED"); continue; }
      if (tx.type === "OPTIONASSIGNMENT") { runningUnits = 0; flush("ASSIGNED"); continue; }
      runningUnits += tx.units;
      if (runningUnits === 0) flush("CLOSED");
    }
    if (currentLegs.length > 0) flush("OPEN");
  }

  // Auto-expire contracts that SnapTrade never sent an OPTIONEXPIRATION for
  const today = new Date().toISOString().split("T")[0];
  for (const c of contractChains) {
    if (c.status === "OPEN" && c.expiry < today) {
      c.status = "EXPIRED";
      c.end_date = c.expiry;
      c.open_units = 0;
    }
  }

  // ── Step 2: group by underlying+type, pair rolls into lineage chains ─────
  // Only SELL-first (income/short) contracts participate in roll pairing.
  // BUY-first (long/directional) contracts remain standalone.
  //
  // A roll = BUY-to-close of one contract followed within ROLL_WINDOW_DAYS by
  // a SELL (new contract or add-on to an existing one) in the same
  // underlying+type. Each close pairs with at most one SELL event and each
  // SELL event is consumed by at most one close, so every contract has at
  // most one successor — lineages form disjoint trees, each containing
  // exactly one terminal contract (open, expired, assigned, or an unrolled
  // close). Expiration/assignment settles a chain; a new sell afterwards
  // starts a fresh chain. This keeps simultaneous positions at different
  // strikes in separate chains instead of braiding them together.
  const ROLL_WINDOW_DAYS = 3;
  // Chains spanning longer than this get their oldest contracts split off as
  // settled chains that count toward the month they closed in.
  const MAX_CHAIN_DAYS = 42;

  const displayGroups = new Map<string, ContractChain[]>();
  for (const c of contractChains) {
    const key = `${c.underlying}|${c.option_type}`;
    if (!displayGroups.has(key)) displayGroups.set(key, []);
    displayGroups.get(key)!.push(c);
  }

  const result: OptionChain[] = [];
  const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

  const buildChain = (seq: ContractChain[], root: ContractChain): OptionChain => {
    const allLegs = seq.flatMap(c => c.legs).sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      const rank = (t: string) => t === "BUY" ? 1 : 0;
      return rank(a.type) - rank(b.type);
    });
    const net_pnl = seq.reduce((s, c) => s + c.net_pnl, 0);
    const end_date = root.end_date;
    return {
      underlying: root.underlying,
      option_type: root.option_type,
      legs: allLegs,
      net_pnl,
      status: root.status,
      start_date: allLegs[0].date,
      end_date,
      open_units: root.open_units,
      roll_count: seq.length - 1,
      close_month: end_date ? end_date.substring(0, 7) : null,
      direction: seq[0].first_action === "BUY" ? "BUY" : "SELL",
    };
  };

  for (const contracts of displayGroups.values()) {
    const shorts = contracts.filter(c => c.first_action === "SELL");
    const longs  = contracts.filter(c => c.first_action !== "SELL");

    // Every SELL leg (initial open or add-on) is a potential roll target.
    type SellEvent = { node: ContractChain; date: string; units: number; consumed: boolean };
    const sellEvents: SellEvent[] = shorts.flatMap(c =>
      c.legs
        .filter(l => l.type === "SELL")
        .map(l => ({ node: c, date: l.date, units: Math.abs(l.units), consumed: false }))
    );

    // Pair each BUY-to-close with its most plausible roll target: nearest in
    // time, then matching contract count, then closest strike.
    const rollNext = new Map<ContractChain, ContractChain>();
    const closedShorts = shorts
      .filter(c => c.status === "CLOSED" && c.end_date)
      .sort((a, b) => a.end_date!.localeCompare(b.end_date!) || a.strike - b.strike);
    for (const c of closedShorts) {
      const soldUnits = c.legs.filter(l => l.type === "SELL").reduce((s, l) => s + Math.abs(l.units), 0);
      let best: SellEvent | null = null;
      let bestScore = Infinity;
      for (const ev of sellEvents) {
        if (ev.consumed || ev.node === c) continue;
        const gap = daysBetween(c.end_date!, ev.date);
        if (gap < 0 || gap > ROLL_WINDOW_DAYS) continue;
        const score = gap * 10000 + (ev.units === soldUnits ? 0 : 5000) + Math.abs(ev.node.strike - c.strike);
        if (score < bestScore) { bestScore = score; best = ev; }
      }
      if (best) { best.consumed = true; rollNext.set(c, best.node); }
    }

    // Group contracts into lineage trees by following successors to the root.
    const rootOf = (c: ContractChain): ContractChain => {
      let cur = c;
      const seen = new Set<ContractChain>([cur]);
      while (rollNext.has(cur)) {
        const next = rollNext.get(cur)!;
        if (seen.has(next)) break;
        seen.add(next);
        cur = next;
      }
      return cur;
    };
    const trees = new Map<ContractChain, ContractChain[]>();
    for (const c of shorts) {
      const root = rootOf(c);
      if (!trees.has(root)) trees.set(root, []);
      trees.get(root)!.push(c);
    }

    for (const [root, nodes] of trees) {
      nodes.sort((a, b) => a.start_date.localeCompare(b.start_date));
      // Settle stale history: split off the oldest contracts until the
      // remaining chain spans ≤ MAX_CHAIN_DAYS. The live (root) contract is
      // never split off.
      const chainEnd = root.end_date ?? today;
      while (
        nodes.length > 1 &&
        nodes[0] !== root &&
        daysBetween(nodes[0].start_date, chainEnd) > MAX_CHAIN_DAYS
      ) {
        const stale = nodes.shift()!;
        result.push(buildChain([stale], stale));
      }
      result.push(buildChain(nodes, root));
    }

    for (const c of longs) result.push(buildChain([c], c));
  }

  return result.sort((a, b) => b.start_date.localeCompare(a.start_date));
}
