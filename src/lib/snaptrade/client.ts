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
