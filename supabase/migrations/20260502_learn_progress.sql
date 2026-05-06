create table learn_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  lesson_id text not null,
  completed boolean default false,
  quiz_score integer,          -- percentage 0-100, null if no quiz
  quiz_answers jsonb,          -- { questionId: selectedAnswer }
  scroll_position float,       -- 0.0 to 1.0 for resume
  time_spent_seconds integer default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, module_id, lesson_id)
);

-- RLS
alter table learn_progress enable row level security;
create policy "Users manage own progress" on learn_progress
  for all using (auth.uid() = user_id);

-- Index for fast lookups
create index idx_learn_progress_user on learn_progress(user_id);
