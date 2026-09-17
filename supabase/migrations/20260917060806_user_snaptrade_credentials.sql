create table user_snaptrade_credentials (
  user_id uuid primary key references auth.users(id),
  snaptrade_user_id text not null,
  encrypted_secret text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_snaptrade_credentials enable row level security;

-- Deliberately no user-facing policy at all, not even for their own row —
-- this is the one table in the app no client should ever be able to read.
create policy "Service role only" on user_snaptrade_credentials
  for all to service_role using (true) with check (true);
