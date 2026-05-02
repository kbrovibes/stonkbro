-- CSP Alpha Hunter: stores scan results for delta tracking between runs
create table if not exists csp_scans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  -- Scan metadata
  scan_type text not null default 'scheduled',  -- 'scheduled' | 'manual'
  ticker_count int not null default 0,
  candidate_count int not null default 0,
  capital numeric not null default 100000,

  -- Raw scan results (full JSON array of candidates)
  candidates jsonb not null default '[]'::jsonb,

  -- Delta from previous scan
  delta jsonb default null,  -- { new: [], premium_increased: [], premium_decreased: [], dropped: [] }

  -- Claude analysis
  claude_analysis text default null,
  claude_provider text default null,  -- 'claude' | 'gemini'

  -- Status
  status text not null default 'running'  -- 'running' | 'completed' | 'failed'
);

-- Index for fast "latest scan" lookups
create index idx_csp_scans_created_at on csp_scans (created_at desc);
create index idx_csp_scans_status on csp_scans (status);

-- RLS: allow authenticated users to read their scans
-- (single-user app, so just require auth)
alter table csp_scans enable row level security;

create policy "Authenticated users can read csp_scans"
  on csp_scans for select
  to authenticated
  using (true);

create policy "Service role can manage csp_scans"
  on csp_scans for all
  to service_role
  using (true)
  with check (true);
