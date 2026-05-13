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

export async function getTransactions(days = 90) {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
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
}

export async function getOptionChains(days = 90): Promise<OptionChain[]> {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const accounts = await getAccounts();

  const allRaw = await Promise.all(
    accounts.map(async (acct) => {
      const res = await accountApi.getAccountActivities({
        userId: UID, userSecret: USEC, accountId: acct.id, startDate: start, endDate: end,
      });
      return ((res.data as any)?.data ?? res.data ?? []) as any[];
    })
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
    .sort((a, b) => a.date.localeCompare(b.date));

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
        net_pnl: currentLegs.reduce((s, l) => s + l.amount, 0),
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

  // ── Step 2: group by underlying+type, roll-chain SHORT contracts ─────────
  // Only SELL-first (income/short) contracts are roll-chained together.
  // BUY-first (long/directional) contracts remain standalone.
  const displayGroups = new Map<string, ContractChain[]>();
  for (const c of contractChains) {
    const key = `${c.underlying}|${c.option_type}`;
    if (!displayGroups.has(key)) displayGroups.set(key, []);
    displayGroups.get(key)!.push(c);
  }

  const result: OptionChain[] = [];

  const buildChain = (seq: ContractChain[]): OptionChain => {
    const allLegs = seq.flatMap(c => c.legs).sort((a, b) => a.date.localeCompare(b.date));
    const last = seq[seq.length - 1];
    const net_pnl = seq.reduce((s, c) => s + c.net_pnl, 0);
    const end_date = last.end_date;
    return {
      underlying: seq[0].underlying,
      option_type: seq[0].option_type,
      legs: allLegs,
      net_pnl,
      status: last.status,
      start_date: seq[0].start_date,
      end_date,
      open_units: last.open_units,
      roll_count: seq.length - 1,
      close_month: end_date ? end_date.substring(0, 7) : null,
    };
  };

  for (const contracts of displayGroups.values()) {
    contracts.sort((a, b) => a.start_date.localeCompare(b.start_date));
    const shorts = contracts.filter(c => c.first_action === "SELL");
    const longs  = contracts.filter(c => c.first_action !== "SELL");

    if (shorts.length > 0) {
      let seq: ContractChain[] = [shorts[0]];
      for (let i = 1; i < shorts.length; i++) {
        const prev = seq[seq.length - 1];
        const curr = shorts[i];
        if (prev.end_date && prev.status !== "OPEN") {
          const daysDiff = (new Date(curr.start_date).getTime() - new Date(prev.end_date).getTime()) / 86400000;
          if (daysDiff <= 3) { seq.push(curr); continue; }
        }
        result.push(buildChain(seq));
        seq = [curr];
      }
      result.push(buildChain(seq));
    }

    for (const c of longs) result.push(buildChain([c]));
  }

  return result.sort((a, b) => b.start_date.localeCompare(a.start_date));
}
