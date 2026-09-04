-- Period return, not annualized.
--
-- Annualizing a realized loss implies you would repeat that loss every cycle:
-- an 8% assignment loss on a 7-day CSP becomes -400% at 365/7. That is not a
-- meaningful number and it destroys any average it lands in. Blended stats now
-- use realized_period_pct; realized_aroc stays annualized only for wins, where
-- it is legitimately comparable to the AROC we projected.
alter table trade_decisions add column if not exists realized_period_pct numeric;

comment on column trade_decisions.realized_period_pct is
  'P&L / collateral * 100 over the holding period. Never annualized. Use this for every blended average.';
comment on column trade_decisions.realized_aroc is
  'Annualized return. Populated for wins only — null for losses so it can never be averaged into a blended figure.';
comment on column trade_decisions.realized_vs_projected is
  'realized_period_pct - (aroc * dte / 365). Both sides on a period basis.';
comment on column trade_decisions.alpha_vs_hold is
  'realized_period_pct - buy-and-hold period return over the identical window.';

-- Backfill period return for rows already graded under the old methodology.
update trade_decisions
set realized_period_pct = case
  when strategy in ('CSP', 'CC') and outcome in ('expired_worthless', 'breached_recovered')
    then (premium / (strike * 100)) * 100
  when strategy in ('CSP', 'CC') and outcome = 'assigned'
    then ((premium - (strike - price_at_expiry) * 100) / (strike * 100)) * 100
  when strategy in ('CALL', 'LEAPS')
    then realized_aroc  -- long calls were already stored as a period return
end
where outcome is not null
  and realized_period_pct is null
  and strike is not null and strike > 0
  and premium is not null;

-- Drop the annualized loss figures: they are the bug.
update trade_decisions
set realized_aroc = null
where outcome in ('assigned', 'expired_otm', 'itm');

-- Both of these were computed against an annualized figure. Null them so the
-- regrade pass recomputes them on a period basis.
update trade_decisions
set realized_vs_projected = null,
    alpha_vs_hold = null
where outcome is not null;

update trade_decisions
set realized_vs_projected = realized_period_pct - (aroc * dte / 365.0)
where outcome is not null
  and realized_period_pct is not null
  and aroc is not null
  and dte is not null and dte > 0;
