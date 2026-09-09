-- LEAPS Lab + PMCC Income (spec 59): daily scan rows and per-user pins.

create table if not exists leaps_scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scan_type text not null default 'scheduled',
  universe_size int not null default 0,
  leaps jsonb not null default '[]'::jsonb,   -- LeapsPick[]
  pmcc jsonb not null default '[]'::jsonb,    -- PmccIncomePick[] (budget-independent fields)
  errors jsonb not null default '[]'::jsonb,
  status text not null default 'completed'
);
create index if not exists idx_leaps_scans_created_at on leaps_scans (created_at desc);
alter table leaps_scans enable row level security;
create policy "auth read leaps_scans" on leaps_scans for select to authenticated using (true);
create policy "service all leaps_scans" on leaps_scans for all to service_role using (true) with check (true);

create table if not exists leaps_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  expiry date not null,
  recommended jsonb not null default '{}'::jsonb, -- {strike,mid,iv,delta,score,why,capturedAt, itm:{...}, otm:{...}}
  strikes jsonb not null default '[]'::jsonb,     -- [{strike,label,addedAt}]
  compare_strike numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);
alter table leaps_pins enable row level security;
create policy "own leaps_pins" on leaps_pins for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "service all leaps_pins" on leaps_pins for all to service_role using (true) with check (true);
