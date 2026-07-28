-- Bloodbath iteration 2: SPY/QQQ benchmark drawdowns stored per scan
alter table bloodbath_scans add column if not exists benchmarks jsonb not null default '[]'::jsonb;
