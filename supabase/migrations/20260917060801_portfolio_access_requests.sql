create table portfolio_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null unique,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id)
);

alter table portfolio_access_requests enable row level security;

create policy "Users manage own access request" on portfolio_access_requests
  for select using (auth.uid() = user_id);

create policy "Users create own access request" on portfolio_access_requests
  for insert with check (auth.uid() = user_id);

create policy "Service role can manage access requests" on portfolio_access_requests
  for all to service_role using (true) with check (true);
