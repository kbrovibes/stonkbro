-- Market-monitor alerts: hourly cron detects big moves in portfolio/watchlist
-- symbols and market-wide drops, stores actionable alerts, pushes the important
-- ones to the phone.
create table if not exists alerts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  severity text not null,         -- 'critical' | 'warning' | 'info'
  kind text not null,             -- 'position_drop' | 'position_surge' | 'market_drop' | 'watchlist_move' | 'stop_suggestion'
  symbol text default null,       -- null for market-wide alerts
  title text not null,
  body text not null,
  action text default null,       -- concrete step to take (stop levels etc.)
  url text not null default '/',

  dedupe_key text not null unique,
  acknowledged boolean not null default false,
  pushed boolean not null default false
);

create index idx_alerts_created_at on alerts (created_at desc);
create index idx_alerts_unacked on alerts (acknowledged) where acknowledged = false;

alter table alerts enable row level security;

create policy "Authenticated users can read alerts"
  on alerts for select
  to authenticated
  using (true);

create policy "Service role can manage alerts"
  on alerts for all
  to service_role
  using (true)
  with check (true);
