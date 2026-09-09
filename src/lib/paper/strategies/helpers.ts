import { weekStart } from "../dates";
import type { Order, Position, StrategyContext } from "../types";

export function num(ctx: StrategyContext, key: string, fallback: number): number {
  const v = ctx.profile.params[key];
  return typeof v === "number" ? v : fallback;
}

export function stocks(ctx: StrategyContext, symbol?: string): Position[] {
  return ctx.positions.filter((p) => p.kind === "stock" && p.side === "long" && (!symbol || p.symbol === symbol));
}

export function shortOptions(ctx: StrategyContext, kind: "put" | "call", symbol?: string): Position[] {
  return ctx.positions.filter((p) => p.kind === kind && p.side === "short" && (!symbol || p.symbol === symbol));
}

export function longOptions(ctx: StrategyContext, kind: "put" | "call", symbol?: string): Position[] {
  return ctx.positions.filter((p) => p.kind === kind && p.side === "long" && (!symbol || p.symbol === symbol));
}

export function price(ctx: StrategyContext, symbol: string): number | null {
  const q = ctx.quote(symbol);
  return q && q.price > 0 ? q.price : null;
}

export function unrealizedPct(p: Position): number {
  const mark = p.meta.mark ?? p.avgPrice;
  if (p.avgPrice <= 0) return 0;
  const raw = (mark / p.avgPrice - 1) * 100;
  return p.side === "long" ? raw : -raw;
}

export function positionValue(p: Position): number {
  return Math.abs(p.meta.markValue ?? p.qty * p.avgPrice * (p.kind === "stock" ? 1 : 100));
}

/** Tracks cash as orders are stacked so a batch never overspends. */
export class Budget {
  constructor(public remaining: number) {}
  spend(amount: number): boolean {
    if (amount > this.remaining + 1e-6) return false;
    this.remaining -= amount;
    return true;
  }
  add(amount: number): void {
    this.remaining += amount;
  }
}

/** Buy up to `usd` of a stock inside the budget. Null when not even one share fits. */
export function buyStock(ctx: StrategyContext, symbol: string, usd: number, budget: Budget, reason: string): Order | null {
  const px = price(ctx, symbol);
  if (!px) return null;
  const qty = Math.floor(Math.min(usd, budget.remaining) / px);
  if (qty < 1) return null;
  budget.spend(qty * px);
  return { symbol, kind: "stock", action: "buy", qty, reason };
}

export function sellAll(p: Position, reason: string): Order {
  return {
    symbol: p.symbol,
    kind: p.kind,
    action: p.side === "long" ? "sell" : "buy",
    qty: p.qty,
    strike: p.strike ?? undefined,
    expiry: p.expiry ?? undefined,
    positionId: p.id,
    reason,
  };
}

/** The `n` most liquid quoted symbols under `maxPrice`, by average volume. */
export function liquidUniverse(ctx: StrategyContext, symbols: string[], maxPrice: number, n: number, minPrice = 0): string[] {
  return symbols
    .map((s) => ctx.quote(s))
    .filter((q): q is NonNullable<typeof q> => !!q && q.price > minPrice && q.price < maxPrice)
    .sort((a, b) => b.avgVolume - a.avgVolume)
    .slice(0, n)
    .map((q) => q.symbol);
}

export function thisWeek(ctx: StrategyContext): string {
  return weekStart(ctx.date);
}

export const fmtPct = (n: number): string => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
export const fmtUsd = (n: number): string => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
export const optLabel = (strike: number, type: "call" | "put", expiry: string): string =>
  `${strike}${type === "call" ? "C" : "P"} ${expiry}`;
