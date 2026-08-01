-- Portfolio option chains: cached computed OptionChain[] so page loads are one
-- DB read instead of a paced (minutes-long) SnapTrade activities walk.
create table if not exists portfolio_chain_scans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  scan_type text not null default 'scheduled',  -- 'scheduled' | 'manual'
  start_date date not null,                      -- activities window start the chains were computed from
  chain_count int not null default 0,

  -- Full OptionChain[] as returned by getOptionChains
  chains jsonb not null default '[]'::jsonb,

  status text not null default 'running',  -- 'running' | 'completed' | 'failed'
  error_message text default null,
  duration_ms int default null
);

create index idx_portfolio_chain_scans_created_at on portfolio_chain_scans (created_at desc);
create index idx_portfolio_chain_scans_status on portfolio_chain_scans (status);

-- Personal brokerage data: service-role access only (the API route gates
-- reads via hasPortfolioAccess and uses the admin client). No authenticated
-- read policy on purpose.
alter table portfolio_chain_scans enable row level security;

create policy "Service role can manage portfolio_chain_scans"
  on portfolio_chain_scans for all
  to service_role
  using (true)
  with check (true);
