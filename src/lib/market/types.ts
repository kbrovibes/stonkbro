export type QuoteData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  marketCap: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
  above50sma: boolean;
  above200sma: boolean;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  earningsDate: string | null;
};

export type OptionContract = {
  strike: number;
  expiry: string;
  dte: number;
  type: "call" | "put";
  bid: number;
  ask: number;
  mid: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  // Real Greeks (from Tradier) — undefined when using mock
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
};

export type OptionsChain = {
  expirations: string[];
  calls: OptionContract[];
  puts: OptionContract[];
};
