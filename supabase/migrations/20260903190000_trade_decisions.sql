-- Decision Journal: every recommendation we surfaced, plus how it actually turned out.
create table if not exists trade_decisions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  -- When we surfaced this recommendation
  decided_at timestamptz not null,
  source text not null,      -- 'csp_scan' | 'call_scan' | 'leaps_scan' | 'manual'
  strategy text not null,    -- 'CSP' | 'CC' | 'LEAPS' | 'CALL'

  -- Contract
  symbol text not null,
  strike numeric,
  expiry date,
  dte int,

  -- Projected at decision time
  entry_price numeric,       -- underlying price when we surfaced it
  premium numeric,
  delta numeric,
  iv numeric,
  aroc numeric,

  -- Our labels at decision time (calibration targets)
  juiciness numeric,
  conviction text,
  priority text,

  -- Context at decision time
  rsi numeric,
  technical_score numeric,
  near_support boolean,
  earnings_within_dte boolean,
  regime text,

  snapshot jsonb not null default '{}'::jsonb,

  -- Outcome, null until matured
  outcome text,              -- 'expired_worthless' | 'assigned' | 'breached_recovered' | 'expired_otm' | 'itm' | 'open' | 'unknown'
  resolved_at timestamptz,
  price_at_expiry numeric,
  min_price_during numeric,
  realized_aroc numeric,
  max_drawdown_pct numeric,

  -- Excess-return tracking
  realized_vs_projected numeric,  -- realized_aroc - aroc (are we over-promising?)
  alpha_vs_hold numeric,          -- realized_aroc - annualized buy-and-hold over the same window

  unique (source, symbol, strike, expiry, decided_at)
);

create index if not exists idx_trade_decisions_symbol on trade_decisions (symbol);
create index if not exists idx_trade_decisions_expiry on trade_decisions (expiry);
create index if not exists idx_trade_decisions_outcome on trade_decisions (outcome);
create index if not exists idx_trade_decisions_decided_at on trade_decisions (decided_at desc);
create index if not exists idx_trade_decisions_resolved_at on trade_decisions (resolved_at desc);

alter table trade_decisions enable row level security;

create policy "Authenticated users can read trade_decisions"
  on trade_decisions for select
  to authenticated
  using (true);

create policy "Service role can manage trade_decisions"
  on trade_decisions for all
  to service_role
  using (true)
  with check (true);
