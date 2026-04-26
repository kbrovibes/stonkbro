-- Daily AI-generated recommendations cache
CREATE TABLE IF NOT EXISTS daily_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme text NOT NULL CHECK (theme IN ('moonshot', 'local_optimization', 'csp_premium')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  picks jsonb NOT NULL,         -- array of {symbol, price, changePct, rationale, action, strike?, expiry?, premium?}
  prompt_used text,
  model text DEFAULT 'claude-sonnet-4-20250514',
  raw_response text
);

-- Index for fast lookups
CREATE INDEX idx_daily_recs_theme_date ON daily_recommendations(theme, generated_at DESC);

-- RLS not needed — this is a shared cache, not per-user
ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read recommendations" ON daily_recommendations FOR SELECT USING (true);
CREATE POLICY "Service role can insert" ON daily_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can delete" ON daily_recommendations FOR DELETE USING (true);
