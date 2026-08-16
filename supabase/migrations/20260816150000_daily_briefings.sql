-- Daily audio briefing: one row per generated briefing (history kept),
-- plus a private storage bucket for the MP3 files.

create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  trigger text not null default 'cron' check (trigger in ('cron', 'manual')),
  title text,
  summary text,
  transcript text,
  highlights jsonb,
  actions jsonb,
  mood text,
  art_seed integer,
  audio_path text,
  audio_bytes integer,
  audio_duration_s numeric,
  voice text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists daily_briefings_date_idx
  on daily_briefings (briefing_date desc, created_at desc);

-- Service-role access only: all reads go through the auth-gated API routes.
alter table daily_briefings enable row level security;

-- Private bucket for briefing MP3s; served through /api/briefing/audio/[id].
insert into storage.buckets (id, name, public)
values ('briefings', 'briefings', false)
on conflict (id) do nothing;
