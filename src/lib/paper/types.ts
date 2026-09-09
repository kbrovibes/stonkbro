import type { DailyBar } from "@/lib/market/history";
import type { OptionContract, QuoteData } from "@/lib/market/types";

export type Session = "open" | "midday" | "close";
export const SESSIONS: readonly Session[] = ["open", "midday", "close"];
export const SESSION_ORDER: Record<Session, number> = { open: 0, midday: 1, close: 2 };

export type PositionKind = "stock" | "call" | "put";
export type Side = "long" | "short";
export type StyleTag =
  | "stocks" | "options" | "mixed"
  | "margin" | "no-margin"
  | "index" | "growth" | "income" | "momentum" | "contrarian" | "sector" | "neutral";

export interface Profile {
  id: string;
  name: string;
  tagline: string;
  style: StyleTag[];
  plan: string[];
  universe: string[];
  params: Record<string, number | string | boolean | string[]>;
  /** Whether the broker extends the $200K margin line to this profile. */
  margin: boolean;
}

export interface Account {
  profileId: string;
  cash: number;
  marginLimit: number;
  realizedPnl: number;
  fees: number;
  interest: number;
  startedOn: string;
  /** Strategy scratch state, persisted per profile. */
  state: Record<string, unknown>;
}

export interface PositionMeta {
  /** IV at entry (fraction) — the Black–Scholes fallback mark uses it. */
  iv?: number;
  entryDelta?: number;
  /** Underlying price at entry. */
  entrySpot?: number;
  /** Highest close since entry (momentum trailing stops). */
  highClose?: number;
  /** Per-share/contract mark from the last run. */
  mark?: number;
  /** Signed total value of the position at the last mark. */
  markValue?: number;
  markDelta?: number;
  /** Option margin held against this (short) position. */
  marginHeld?: number;
  /** "naked" recomputes margin each mark; anything else keeps `marginHeld`. */
  marginMode?: "naked" | "cash-secured" | "spread" | "covered" | "none";
  /** Groups the legs of a multi-leg structure (condor). */
  group?: string;
  /** Credit received when the group was opened (per contract, per share). */
  groupCredit?: number;
  /** Set by settlement so a strategy can react (the wheel's assignment). */
  assignedFrom?: string;
  entryDate?: string;
  [key: string]: unknown;
}

export interface Position {
  id: string;
  profileId: string;
  symbol: string;
  kind: PositionKind;
  side: Side;
  qty: number;
  strike: number | null;
  expiry: string | null;
  avgPrice: number;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  realizedPnl: number;
  status: "open" | "closed";
  meta: PositionMeta;
}

export type TradeAction =
  | "buy" | "sell"
  | "assign" | "called_away" | "expire" | "settle"
  | "interest" | "reject";

export interface Trade {
  id: string;
  profileId: string;
  ts: string;
  tradeDate: string;
  session: Session;
  symbol: string;
  kind: PositionKind | "cash";
  action: TradeAction;
  qty: number;
  price: number;
  strike: number | null;
  expiry: string | null;
  /** Signed cash effect. */
  amount: number;
  fees: number;
  reason: string;
  positionId: string | null;
  status: "filled" | "rejected";
}

export interface Order {
  symbol: string;
  kind: PositionKind;
  /** `buy` opens long / closes short; `sell` opens short / closes long. */
  action: "buy" | "sell";
  qty: number;
  strike?: number;
  expiry?: string;
  reason: string;
  /** Close this specific position (partial when qty < position qty). */
  positionId?: string;
  /** Stored on a newly opened position. */
  meta?: PositionMeta;
}

export interface FindOptionQuery {
  symbol: string;
  type: "call" | "put";
  targetDelta: number;
  minDte: number;
  maxDte: number;
  targetDte?: number;
  minStrike?: number;
  maxStrike?: number;
}

export interface FoundOption {
  contract: OptionContract;
  /** Absolute delta, from the chain or estimated from moneyness. */
  delta: number;
}

/** What a strategy wants fetched before it decides. */
export interface ChainNeed {
  symbol: string;
  minDte: number;
  maxDte: number;
  /** Preferred DTE; the fetcher picks the nearest expiry under Tradier. */
  targetDte?: number;
}

export interface StrategyContext {
  profile: Profile;
  account: Account;
  /** Open, marked positions for this profile. Meta is mutable and persisted. */
  positions: Position[];
  /** Mutable, persisted with the account. */
  state: Record<string, unknown>;
  equity: number;
  cash: number;
  buyingPower: number;
  session: Session;
  date: string;
  isFirstSessionOfWeek: boolean;
  isFirstSessionOfMonth: boolean;
  quote(symbol: string): QuoteData | undefined;
  history(symbol: string): DailyBar[];
  sma(symbol: string, n: number): number | null;
  rsi14(symbol: string): number | null;
  returnPct(symbol: string, days: number): number | null;
  findOption(q: FindOptionQuery): FoundOption | null;
  /** Current quote for a held contract, when the chain is loaded. */
  optionQuote(symbol: string, type: "call" | "put", strike: number, expiry: string): OptionContract | null;
  /** Absolute delta for a held option (chain, else Black–Scholes). */
  deltaOf(position: Position): number | null;
  /** Every loaded contract for a symbol (empty when no chain was fetched). */
  chain(symbol: string): OptionContract[];
  dte(expiry: string): number;
}

export interface Strategy {
  needs(ctx: StrategyContext): ChainNeed[];
  decide(ctx: StrategyContext): Order[];
}

export interface MarketView {
  price(symbol: string): number | null;
  option(symbol: string, type: "call" | "put", strike: number, expiry: string): OptionContract | null;
  dte(expiry: string): number;
}

export interface Snapshot {
  profileId: string;
  snapDate: string;
  session: Session;
  equity: number;
  cash: number;
  marginUsed: number;
  positionsValue: number;
  dayPnl: number;
  totalPnl: number;
  totalReturnPct: number;
  positions: MarkedPosition[];
}

export interface MarkedPosition {
  id: string;
  symbol: string;
  kind: PositionKind;
  side: Side;
  qty: number;
  strike: number | null;
  expiry: string | null;
  avgPrice: number;
  mark: number;
  value: number;
  pnl: number;
  pnlPct: number;
  delta: number | null;
  openedAt: string;
}

export interface ProfileNote {
  profileId: string | null;
  noteDate: string;
  highlights: string[];
  learnings: string[];
  narrative: string | null;
  stats: Record<string, unknown>;
}

export const START_CASH = 100_000;
export const MARGIN_LIMIT = 200_000;
export const OPTION_FEE = 0.65;
export const MARGIN_APR = 0.08;
export const RISK_FREE = 0.04;
