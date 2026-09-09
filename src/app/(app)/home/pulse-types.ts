import type { BriefingMood, BriefingStatus } from "@/lib/briefing/types";
import type { MarketStatus } from "@/lib/market/market-status";

/**
 * The Pulse screen's props. Everything here crosses the server → client
 * boundary, so it is plain data: no Dates, no DB rows, no functions.
 */

export type PulseTile = {
  symbol: string;
  changePct: number;
  points: number[];
};

/** One card in a `TickerCardGrid`. */
export type PulseTicker = {
  symbol: string;
  price: number;
  changePct: number;
  /** Server-side sparkline. Absent means the grid fetches it client-side. */
  points?: number[];
  held?: boolean;
  atRisk?: boolean;
};

export type PulseMover = PulseTicker & {
  /** Derived cause. Null when nothing was derivable — never invented. */
  badge: string | null;
  caption: string | null;
  points: number[];
  held: boolean;
  atRisk: boolean;
};

export type PulseWatchlist = {
  id: string;
  name: string;
  tickers: PulseTicker[];
};

export type PulseBriefing = {
  id: string;
  title: string | null;
  summary: string | null;
  minutes: number | null;
  mood: BriefingMood;
  art_seed: number;
  status: BriefingStatus;
};

export type PulseFeature = {
  href: string;
  label: string;
  /** A 24×24 stroke path `d`. */
  icon: string;
};

export type PulseScreenProps = {
  /** `FRI SEP 4`, computed server-side so SSR and hydration agree. */
  dateLabel: string;
  status: MarketStatus;
  hero: { name: string; level: number; changePct: number } | null;
  breadth: { advancing: number; declining: number };
  tiles: PulseTile[];
  movers: PulseMover[];
  /** Everything that cleared the mover filter, not just what is listed. */
  moverTotal: number;
  /** Null for guests, users without portfolio access, or when no row exists. */
  briefing: PulseBriefing | null;
  features: PulseFeature[];
  /** Only lists with at least one ticker; empty for guests. */
  watchlists: PulseWatchlist[];
  /** Top / bottom of the day, filled only when `watchlists` is empty. */
  winners: PulseTicker[];
  losers: PulseTicker[];
};
