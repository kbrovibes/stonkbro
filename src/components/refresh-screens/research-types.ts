/**
 * The shapes `/api/ticker/[symbol]/research` returns.
 *
 * Kept out of the route file so the screen can import them without importing
 * a route module — Next validates the exports of `route.ts`, and a screen
 * reaching into one is the kind of coupling that stops building on an upgrade.
 */

export type ResearchSnapshot = {
  symbol: string;
  name: string;
  sector: string | null;
  price: number;
  changePct: number;
  /** Closes, oldest first. Feeds `HeroChart`. */
  chart: number[];
  /** Every strip value is null when its input is unavailable. */
  iv: number | null;
  ivRank: number | null;
  /**
   * True when `ivRank` is the realized-vol percentile proxy rather than a
   * real implied-vol history. Always true today — see the route.
   */
  ivRankIsProxy: boolean;
  rsi: number | null;
  relativeVolume: number | null;
};

export type ResearchStructure = {
  strategy: string;
  strike: number;
  expiry: string;
  dte: number;
  delta: number;
  collateral: number;
  monthlyRoc: number;
  /** Null when the account's cash is unknown — the chrome label depends on it. */
  fitsCapital: boolean | null;
};

export type EarningsReaction = {
  date: string;
  /** Signed close-to-close move on the reaction session, in percent. */
  movePct: number;
};

export type ResearchEarnings = {
  reactions: EarningsReaction[];
  avgMovePct: number | null;
  impliedMovePct: number | null;
  upCount: number;
  total: number;
};

export type ResearchAnswer = {
  answer: string;
  bull: string | null;
  bear: string | null;
  provider?: string;
};
