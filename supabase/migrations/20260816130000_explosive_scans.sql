-- Explosive finder: cache scan results per dropdown selection (sector slug or "all") for 24h
create table if not exists explosive_scans (
  id uuid default gen_random_uuid() primary key,
  selection text not null,
  results jsonb,
  status text not null default 'completed',
  error text default null,
  created_at timestamptz default now() not null
);

create index idx_explosive_scans_selection_created_at
  on explosive_scans (selection, created_at desc);

alter table explosive_scans enable row level security;

create policy "Authenticated users can read explosive_scans"
  on explosive_scans for select
  to authenticated
  using (true);

create policy "Service role can manage explosive_scans"
  on explosive_scans for all
  to service_role
  using (true)
  with check (true);
