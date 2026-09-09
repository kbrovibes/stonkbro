-- Paper trading: what each bot remembers across days, on top of the daily notes.

create table if not exists paper_memory (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references paper_profiles(id) on delete cascade,
  kind text not null check (kind in ('creed','conviction','lesson','scar','streak','milestone')),
  headline text not null,
  detail text,
  weight numeric not null default 1,
  hits int not null default 1,
  first_seen date not null,
  last_seen date not null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (profile_id, kind, headline)
);

create index if not exists idx_paper_memory_profile on paper_memory (profile_id, last_seen desc);

alter table paper_memory enable row level security;

create policy "Authenticated users can read paper_memory" on paper_memory for select to authenticated using (true);

create policy "Service role can manage paper_memory" on paper_memory for all to service_role using (true) with check (true);
