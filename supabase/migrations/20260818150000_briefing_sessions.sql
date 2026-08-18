-- Three briefing episodes per trading day: premarket / midday / close.
alter table daily_briefings add column if not exists session text not null default 'premarket'
  check (session in ('premarket', 'midday', 'close'));
