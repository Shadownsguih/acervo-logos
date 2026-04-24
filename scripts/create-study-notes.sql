create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova nota',
  content text not null default '',
  context_type text,
  context_key text,
  context_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_notes
  add column if not exists context_type text;

alter table public.study_notes
  add column if not exists context_key text;

alter table public.study_notes
  add column if not exists context_label text;

create index if not exists study_notes_user_id_idx
  on public.study_notes (user_id);

create index if not exists study_notes_user_updated_at_idx
  on public.study_notes (user_id, updated_at desc);

create index if not exists study_notes_user_context_idx
  on public.study_notes (user_id, context_type, context_key, updated_at desc);

alter table public.study_notes enable row level security;

drop policy if exists "Users can view their own study notes" on public.study_notes;
create policy "Users can view their own study notes"
on public.study_notes
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own study notes" on public.study_notes;
create policy "Users can insert their own study notes"
on public.study_notes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own study notes" on public.study_notes;
create policy "Users can update their own study notes"
on public.study_notes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own study notes" on public.study_notes;
create policy "Users can delete their own study notes"
on public.study_notes
for delete
using (auth.uid() = user_id);

drop trigger if exists set_study_notes_updated_at on public.study_notes;
create trigger set_study_notes_updated_at
before update on public.study_notes
for each row
execute function public.set_current_timestamp_updated_at();
