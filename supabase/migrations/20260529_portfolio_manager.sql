-- Portfolio Manager — daily AI research + ratings for stock holdings
-- See specs/54-portfolio-manager.md

-- One row per scan run
CREATE TABLE IF NOT EXISTS portfolio_manager_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,

  scan_type TEXT NOT NULL DEFAULT 'scheduled',          -- 'scheduled' | 'manual'
  trigger_source TEXT,                                  -- 'cron-open' | 'cron-close' | 'user'
  status TEXT NOT NULL DEFAULT 'running',               -- 'running' | 'completed' | 'failed'
  error TEXT,

  -- Snapshot of holdings at scan time (after option filter)
  tickers JSONB NOT NULL DEFAULT '[]'::JSONB,           -- [{ symbol, units, market_value, cost_basis, account_name }, ...]
  ticker_count INT NOT NULL DEFAULT 0,

  -- Per-ticker analyses (typed in src/lib/portfolio-manager/types.ts)
  analyses JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Cross-portfolio $100K reallocation recommendation
  allocation JSONB,

  -- AI metadata
  ai_provider TEXT,                                     -- 'claude' | 'gemini'
  ai_model TEXT,
  ai_fallback BOOLEAN DEFAULT FALSE,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  duration_ms INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pm_scans_created_at ON portfolio_manager_scans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_scans_status ON portfolio_manager_scans (status);
CREATE INDEX IF NOT EXISTS idx_pm_scans_latest_completed
  ON portfolio_manager_scans (created_at DESC) WHERE status = 'completed';

ALTER TABLE portfolio_manager_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read portfolio_manager_scans"
  ON portfolio_manager_scans FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Service role manages portfolio_manager_scans"
  ON portfolio_manager_scans FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Daily ticker cache (one row per UTC day)
CREATE TABLE IF NOT EXISTS portfolio_manager_holdings_cache (
  date DATE PRIMARY KEY,
  tickers JSONB NOT NULL,                               -- [{ symbol, units, market_value, ... }]
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE portfolio_manager_holdings_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages holdings cache"
  ON portfolio_manager_holdings_cache FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
