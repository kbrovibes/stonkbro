/**
 * Which tickers you hold, and which of them have an open position under
 * threat — the two facts that personalise the Pulse movers list.
 *
 * Everything here is gated on an authenticated session and every source is
 * wrapped, because Home is guest-accessible and a broker outage must cost
 * the screen its tags, never its render. A guest gets two empty sets and the
 * same list without tags or reordering.
 *
 * Two sources, unioned:
 *
 *  - the app's own `positions` table, per-user under RLS — available to any
 *    signed-in user;
 *  - the brokerage feed via SnapTrade, which is a single app-wide identity
 *    and so is gated a second time on the portfolio allow-list.
 *
 * "At risk" means a short option is at or through its strike: a short put
 * with the stock at or below the strike is heading for assignment, and a
 * short call with the stock at or above it is about to have the shares
 * called away. Both get a 2% approach band so the tag appears while there is
 * still something to do about it.
 */

import { getPositions } from "@/lib/db/positions";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { getPortfolio } from "@/lib/snaptrade/client";

/** How close to the strike still counts as threatened. */
const APPROACH = 0.02;

export type HoldingTags = {
  /** Symbols held as shares, or underlying an open position. */
  held: ReadonlySet<string>;
  /** Symbols whose open short option is at or through its strike. */
  atRisk: ReadonlySet<string>;
};

export type ShortLeg = { symbol: string; kind: "put" | "call"; strike: number; expiry: string };

/** What you hold, before any price is applied to it. */
export type HoldingBook = { held: string[]; short: ShortLeg[] };

export const EMPTY_BOOK: HoldingBook = { held: [], short: [] };
export const NO_HOLDINGS: HoldingTags = { held: new Set(), atRisk: new Set() };

function threatened(leg: ShortLeg, price: number | undefined): boolean {
  if (!price || price <= 0 || leg.strike <= 0) return false;
  return leg.kind === "put"
    ? price <= leg.strike * (1 + APPROACH)
    : price >= leg.strike * (1 - APPROACH);
}

function unexpired(expiry: string, today: string): boolean {
  return !expiry || expiry >= today;
}

/* -- source 1: the app's own position book ----------------------------- */

type LegRow = { type?: string; strike?: number | string; expiry?: string };
type PositionRow = { symbol?: string; status?: string; position_legs?: LegRow[] };

async function fromAppPositions(userId: string): Promise<HoldingBook> {
  const rows = (await getPositions(userId)) as PositionRow[] | null;
  const held: string[] = [];
  const short: ShortLeg[] = [];

  for (const row of rows ?? []) {
    if (row.status !== "active") continue;
    const symbol = row.symbol?.toUpperCase();
    if (!symbol) continue;
    held.push(symbol);

    for (const leg of row.position_legs ?? []) {
      const kind = leg.type === "short_put" ? "put" : leg.type === "short_call" ? "call" : null;
      if (!kind) continue;
      short.push({ symbol, kind, strike: Number(leg.strike ?? 0), expiry: leg.expiry ?? "" });
    }
  }
  return { held, short };
}

/* -- source 2: the brokerage feed -------------------------------------- */

async function fromBrokerage(): Promise<HoldingBook> {
  const portfolio = await getPortfolio();
  const held: string[] = [];
  const short: ShortLeg[] = [];

  for (const p of portfolio.positions) {
    if (p.is_option || !p.symbol || p.symbol === "UNKNOWN" || p.units === 0) continue;
    held.push(p.symbol.toUpperCase());
  }

  for (const o of portfolio.options) {
    const symbol = o.underlying?.toUpperCase();
    if (!symbol || symbol === "UNKNOWN") continue;
    held.push(symbol);
    // A written contract is a negative holding. Long contracts cannot be
    // assigned, so they tag the row HELD and nothing more.
    if (o.units >= 0) continue;
    const type = (o.option_type ?? "").toUpperCase();
    const kind = type.includes("PUT") ? "put" : type.includes("CALL") ? "call" : null;
    if (!kind) continue;
    short.push({ symbol, kind, strike: o.strike, expiry: o.expiration });
  }
  return { held, short };
}

/* -- public ------------------------------------------------------------ */

/**
 * Read the book. Prices are applied separately so this can be fetched in
 * parallel with the quotes it will later be compared against.
 */
export async function getHoldingBook(
  user: { id: string; email?: string | null } | null,
): Promise<HoldingBook> {
  if (!user) return EMPTY_BOOK;

  const sources = await Promise.allSettled([
    fromAppPositions(user.id),
    hasPortfolioAccess(user.email) ? fromBrokerage() : Promise.resolve(EMPTY_BOOK),
  ]);

  const held: string[] = [];
  const short: ShortLeg[] = [];
  for (const source of sources) {
    if (source.status !== "fulfilled") continue;
    held.push(...source.value.held);
    short.push(...source.value.short);
  }
  return { held, short };
}

/** Apply live prices to the book. Pure — no session, no network. */
export function tagsFromBook(
  book: HoldingBook,
  priceOf: (symbol: string) => number | undefined,
  today: string = new Date().toISOString().slice(0, 10),
): HoldingTags {
  const held = new Set(book.held);
  const atRisk = new Set<string>();
  for (const leg of book.short) {
    if (unexpired(leg.expiry, today) && threatened(leg, priceOf(leg.symbol))) atRisk.add(leg.symbol);
  }
  return { held, atRisk };
}
