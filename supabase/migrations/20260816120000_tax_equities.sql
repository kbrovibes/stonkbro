-- Tax Center equities: cached FIFO stock-sale scans + user basis overrides
-- for sales whose lots arrived via transfer/RSU (connector has no basis).

create table if not exists tax_equity_scans (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  events jsonb,
  meta jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index idx_tax_equity_scans_created on tax_equity_scans(created_at desc);

alter table tax_equity_scans enable row level security;
create policy "Authenticated users read equity scans" on tax_equity_scans
  for select to authenticated using (true);

create table if not exists tax_basis_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  cost_basis numeric not null check (cost_basis >= 0),
  acquired_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

alter table tax_basis_overrides enable row level security;

create policy "Users read own basis overrides" on tax_basis_overrides
  for select using (auth.uid() = user_id);
create policy "Users insert own basis overrides" on tax_basis_overrides
  for insert with check (auth.uid() = user_id);
create policy "Users update own basis overrides" on tax_basis_overrides
  for update using (auth.uid() = user_id);
create policy "Users delete own basis overrides" on tax_basis_overrides
  for delete using (auth.uid() = user_id);
