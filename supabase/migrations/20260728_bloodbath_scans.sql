-- Bloodbath: cached pullback scans + AI verdicts so page loads are one DB read
create table if not exists bloodbath_scans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  scan_type text not null default 'scheduled',  -- 'scheduled' | 'manual'
  scanned_count int not null default 0,

  -- Full BloodbathTicker[] arrays as returned by scanBloodbath
  watchlist jsonb not null default '[]'::jsonb,
  market jsonb not null default '[]'::jsonb,

  -- BloodbathVerdict[] from the batched AI call (null if the call failed)
  verdicts jsonb default null,
  ai_provider text default null,
  ai_model text default null,

  status text not null default 'running',  -- 'running' | 'completed' | 'failed'
  error_message text default null,
  duration_ms int default null
);

create index idx_bloodbath_scans_created_at on bloodbath_scans (created_at desc);
create index idx_bloodbath_scans_status on bloodbath_scans (status);

alter table bloodbath_scans enable row level security;

create policy "Authenticated users can read bloodbath_scans"
  on bloodbath_scans for select
  to authenticated
  using (true);

create policy "Service role can manage bloodbath_scans"
  on bloodbath_scans for all
  to service_role
  using (true)
  with check (true);
