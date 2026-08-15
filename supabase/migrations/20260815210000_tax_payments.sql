-- Tax Center: one-off estimated-tax payments the user has actually sent to
-- the IRS (Direct Pay / EFTPS). The Tax Center subtracts these from the
-- computed cumulative tax to recommend the next payment.
create table if not exists tax_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year int not null,
  paid_date date not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz default now()
);

create index idx_tax_payments_user_year on tax_payments(user_id, tax_year);

alter table tax_payments enable row level security;

create policy "Users read own tax payments" on tax_payments
  for select using (auth.uid() = user_id);

create policy "Users insert own tax payments" on tax_payments
  for insert with check (auth.uid() = user_id);

create policy "Users delete own tax payments" on tax_payments
  for delete using (auth.uid() = user_id);
