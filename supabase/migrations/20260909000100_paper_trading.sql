-- Paper trading: ten bots, $100K each, marked three times per session day.

create table if not exists paper_profiles (
  id text primary key,
  name text not null,
  tagline text not null default '',
  style text[] not null default '{}',
  plan text[] not null default '{}',
  params jsonb not null default '{}'::jsonb,
  universe text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists paper_accounts (
  profile_id text primary key references paper_profiles(id) on delete cascade,
  cash numeric not null default 100000,
  margin_limit numeric not null default 200000,
  realized_pnl numeric not null default 0,
  fees numeric not null default 0,
  interest numeric not null default 0,
  started_on date not null,
  -- Strategy scratch state (weekly entry locks, rebalance reference equity, locked wheel names).
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists paper_positions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references paper_profiles(id) on delete cascade,
  symbol text not null,
  kind text not null check (kind in ('stock', 'call', 'put')),
  side text not null check (side in ('long', 'short')),
  qty int not null,
  strike numeric,
  expiry date,
  avg_price numeric not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  close_price numeric,
  realized_pnl numeric not null default 0,
  status text not null default 'open',
  meta jsonb not null default '{}'::jsonb
);

create table if not exists paper_trades (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references paper_profiles(id) on delete cascade,
  ts timestamptz not null default now(),
  trade_date date not null,
  session text not null,
  symbol text not null,
  kind text not null,
  action text not null,
  qty int not null default 0,
  price numeric not null default 0,
  strike numeric,
  expiry date,
  amount numeric not null default 0,
  fees numeric not null default 0,
  reason text not null default '',
  position_id uuid,
  status text not null default 'filled'
);

create table if not exists paper_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references paper_profiles(id) on delete cascade,
  snap_date date not null,
  session text not null,
  equity numeric not null,
  cash numeric not null,
  margin_used numeric not null default 0,
  positions_value numeric not null default 0,
  day_pnl numeric not null default 0,
  total_pnl numeric not null default 0,
  total_return_pct numeric not null default 0,
  positions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (profile_id, snap_date, session)
);

create table if not exists paper_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id text references paper_profiles(id) on delete cascade,
  note_date date not null,
  highlights text[] not null default '{}',
  learnings text[] not null default '{}',
  narrative text,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique nulls not distinct (profile_id, note_date)
);

create table if not exists paper_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  session text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  log jsonb not null default '{}'::jsonb,
  unique (run_date, session)
);

create index if not exists idx_paper_snapshots_profile_date on paper_snapshots (profile_id, snap_date);
create index if not exists idx_paper_trades_profile_date on paper_trades (profile_id, trade_date);
create index if not exists idx_paper_positions_profile_status on paper_positions (profile_id, status);
create index if not exists idx_paper_notes_date on paper_notes (note_date);

alter table paper_profiles enable row level security;
alter table paper_accounts enable row level security;
alter table paper_positions enable row level security;
alter table paper_trades enable row level security;
alter table paper_snapshots enable row level security;
alter table paper_notes enable row level security;
alter table paper_runs enable row level security;

create policy "Authenticated users can read paper_profiles" on paper_profiles for select to authenticated using (true);
create policy "Authenticated users can read paper_accounts" on paper_accounts for select to authenticated using (true);
create policy "Authenticated users can read paper_positions" on paper_positions for select to authenticated using (true);
create policy "Authenticated users can read paper_trades" on paper_trades for select to authenticated using (true);
create policy "Authenticated users can read paper_snapshots" on paper_snapshots for select to authenticated using (true);
create policy "Authenticated users can read paper_notes" on paper_notes for select to authenticated using (true);
create policy "Authenticated users can read paper_runs" on paper_runs for select to authenticated using (true);

create policy "Service role can manage paper_profiles" on paper_profiles for all to service_role using (true) with check (true);
create policy "Service role can manage paper_accounts" on paper_accounts for all to service_role using (true) with check (true);
create policy "Service role can manage paper_positions" on paper_positions for all to service_role using (true) with check (true);
create policy "Service role can manage paper_trades" on paper_trades for all to service_role using (true) with check (true);
create policy "Service role can manage paper_snapshots" on paper_snapshots for all to service_role using (true) with check (true);
create policy "Service role can manage paper_notes" on paper_notes for all to service_role using (true) with check (true);
create policy "Service role can manage paper_runs" on paper_runs for all to service_role using (true) with check (true);
