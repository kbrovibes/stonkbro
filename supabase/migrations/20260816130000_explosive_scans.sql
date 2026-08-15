-- Explosive finder: cache scan results per dropdown selection (sector slug
-- or "all") for 24h. Writes via service role (bypasses RLS).
create table if not exists explosive_scans (
  id uuid primary key default gen_random_uuid(),
  selection text not null,
  results jsonb,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index idx_explosive_scans_selection on explosive_scans(selection, created_at desc);

alter table explosive_scans enable row level security;

create policy "Authenticated users read explosive scans" on explosive_scans
  for select to authenticated using (true);
