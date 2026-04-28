-- Migration: market_sparklines table for caching 5-day price history
CREATE TABLE IF NOT EXISTS market_sparklines (
  symbol TEXT PRIMARY KEY,
  data JSONB NOT NULL, -- Array of numbers (close prices)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_sparklines_updated_at ON market_sparklines(updated_at);

-- RLS (Row Level Security) - Allow public read if needed, but primarily for server-side
ALTER TABLE market_sparklines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on sparklines" 
  ON market_sparklines FOR SELECT 
  USING (true);
