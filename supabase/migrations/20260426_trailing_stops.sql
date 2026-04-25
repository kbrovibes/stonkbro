-- Add trailing stop and peak tracking to positions
ALTER TABLE positions ADD COLUMN IF NOT EXISTS trailing_stop_pct numeric;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS peak_price numeric;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS entry_price_per_share numeric;
