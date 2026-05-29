export type Rating = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export type TickerSnapshot = {
  symbol: string;
  units: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl_pct: number;
  account_name: string;
};

export type NewsHeadline = {
  title: string;
  url: string;
  published_at: string;
  publisher?: string;
};

export type TickerEnrichment = {
  symbol: string;
  name: string;
  price: number;
  change_1d_pct: number;
  change_5d_pct: number;
  change_30d_pct: number;
  change_90d_pct: number;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  sma_50: number | null;
  sma_200: number | null;
  above_50sma: boolean;
  above_200sma: boolean;
  volume_ratio: number;
  distance_from_52w_high_pct: number;
  distance_from_52w_low_pct: number;
  earnings_date: string | null;
  news_headlines: NewsHeadline[];
};

export type SuggestedAction =
  | { type: "HOLD"; note?: string }
  | { type: "TRIM"; target_pct_of_position: number; note?: string }
  | { type: "ADD"; target_pct_of_position: number; note?: string }
  | { type: "EXIT"; note?: string };

export type TickerAnalysis = {
  symbol: string;
  rating: Rating;
  confidence: number; // 0–100
  thesis: string;
  reasons: string[];
  risks: string[];
  catalysts: string[];
  suggested_action: SuggestedAction;
  enrichment: TickerEnrichment;
};

export type AllocationAction = {
  symbol: string;
  action: "SELL" | "TRIM" | "HOLD" | "ADD" | "BUY";
  dollar_amount: number;
  rationale: string;
};

export type PortfolioAllocation = {
  capital_budget: 100000;
  starting_state: {
    holdings_market_value: number;
    free_cash: number;
  };
  summary: string;
  actions: AllocationAction[];
  capital_released: number;
  capital_deployed: number;
  cash_remaining: number;
  risk_notes: string[];
};

export type PortfolioScanRow = {
  id: string;
  created_at: string;
  completed_at: string | null;
  scan_type: "scheduled" | "manual";
  trigger_source: string | null;
  status: "running" | "completed" | "failed";
  error: string | null;
  tickers: TickerSnapshot[];
  ticker_count: number;
  analyses: TickerAnalysis[];
  allocation: PortfolioAllocation | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_fallback: boolean;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
};
