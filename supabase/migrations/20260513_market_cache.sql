-- Generic key-value cache for market data (IPOs, earnings, etc.)
CREATE TABLE IF NOT EXISTS market_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_cache_updated_at ON market_cache(updated_at);

-- Allow anon/service reads (server-only writes via service role)
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access"
  ON market_cache FOR ALL
  USING (true);
