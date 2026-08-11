create extension if not exists pgcrypto;

create table if not exists public.study_assistant_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null default 'bible',
  context_label text,
  question text not null,
  answer text not null,
  key_points jsonb not null default '[]'::jsonb,
  recommended_material_ids jsonb not null default '[]'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_assistant_history_user_created_idx
  on public.study_assistant_history (user_id, created_at desc);

create index if not exists study_assistant_history_user_context_idx
  on public.study_assistant_history (user_id, context_type, created_at desc);

alter table public.study_assistant_history enable row level security;

drop policy if exists "Users can view their own study assistant history" on public.study_assistant_history;
create policy "Users can view their own study assistant history"
on public.study_assistant_history
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own study assistant history" on public.study_assistant_history;
create policy "Users can insert their own study assistant history"
on public.study_assistant_history
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own study assistant history" on public.study_assistant_history;
create policy "Users can delete their own study assistant history"
on public.study_assistant_history
for delete
using (auth.uid() = user_id);

drop trigger if exists set_study_assistant_history_updated_at on public.study_assistant_history;
create trigger set_study_assistant_history_updated_at
before update on public.study_assistant_history
for each row
execute function public.set_current_timestamp_updated_at();
