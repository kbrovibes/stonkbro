-- Unified async-job tracking: every long-running operation (manual refreshes,
-- scans, crons) registers here so the header indicator and /jobs page can
-- show what's in flight, what happened, and cancel cooperative jobs.
create table if not exists app_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  label text not null,
  trigger text not null check (trigger in ('manual', 'cron', 'auto')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'cancelled')),
  progress text,
  error text,
  meta jsonb,
  cancel_requested boolean not null default false,
  created_by text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint
);

create index idx_app_jobs_started on app_jobs(started_at desc);
create index idx_app_jobs_running on app_jobs(status) where status = 'running';

alter table app_jobs enable row level security;

-- Reads for any signed-in user; all writes go through the service role
-- (API routes + crons), which bypasses RLS.
create policy "Authenticated users read jobs" on app_jobs
  for select to authenticated using (true);
