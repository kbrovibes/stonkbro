-- Watchlists
create table watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table watchlists enable row level security;
create policy "Users manage own watchlists" on watchlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Watchlist items
create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references watchlists(id) on delete cascade not null,
  symbol text not null,
  added_at timestamptz default now(),
  unique(watchlist_id, symbol)
);
alter table watchlist_items enable row level security;
create policy "Users manage own watchlist items" on watchlist_items for all
  using (watchlist_id in (select id from watchlists where user_id = auth.uid()))
  with check (watchlist_id in (select id from watchlists where user_id = auth.uid()));

-- Positions
create table positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  symbol text not null,
  strategy text not null check (strategy in ('PMCC', 'Covered Call', 'Cash-Secured Put', 'The Wheel')),
  status text not null default 'active' check (status in ('active', 'closed', 'rolled')),
  entry_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);
alter table positions enable row level security;
create policy "Users manage own positions" on positions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Position legs
create table position_legs (
  id uuid primary key default gen_random_uuid(),
  position_id uuid references positions(id) on delete cascade not null,
  type text not null check (type in ('leaps_call', 'short_call', 'short_put', 'shares', 'long_put')),
  strike numeric not null,
  expiry date not null,
  entry_price numeric not null,
  quantity integer not null default 1,
  created_at timestamptz default now()
);
alter table position_legs enable row level security;
create policy "Users manage own position legs" on position_legs for all
  using (position_id in (select id from positions where user_id = auth.uid()))
  with check (position_id in (select id from positions where user_id = auth.uid()));

-- Research reports
create table research_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  trigger text not null check (trigger in ('cron', 'manual', 'on_demand')),
  symbols_analyzed text[] not null,
  report text not null,
  created_at timestamptz default now()
);
alter table research_reports enable row level security;
create policy "Users view own reports" on research_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trade suggestions
create table trade_suggestions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references research_reports(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  symbol text not null,
  strategy text not null,
  action text not null,
  strike numeric,
  expiry date,
  premium numeric,
  reasoning text not null,
  status text not null default 'pending' check (status in ('pending', 'executed', 'dismissed', 'expired')),
  created_at timestamptz default now()
);
alter table trade_suggestions enable row level security;
create policy "Users manage own suggestions" on trade_suggestions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- User settings
create table user_settings (
  user_id uuid primary key references auth.users(id),
  starting_cash numeric default 20000,
  alert_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
create policy "Users manage own settings" on user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
