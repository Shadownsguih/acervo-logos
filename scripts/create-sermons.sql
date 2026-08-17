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

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Novo sermao',
  timer_enabled boolean not null default false,
  timer_minutes integer,
  reference_version text,
  reference_book text,
  reference_chapter integer,
  reference_verse_start integer,
  reference_verse_end integer,
  reference_label text,
  reference_text text,
  introduction text not null default '',
  main_points jsonb not null default '[]'::jsonb,
  conclusion text not null default '',
  application text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sermons_user_updated_at_idx
  on public.sermons (user_id, updated_at desc);

create index if not exists sermons_user_reference_idx
  on public.sermons (user_id, reference_book, reference_chapter, updated_at desc);

alter table public.sermons enable row level security;

drop policy if exists "Users can view their own sermons" on public.sermons;
create policy "Users can view their own sermons"
on public.sermons
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sermons" on public.sermons;
create policy "Users can insert their own sermons"
on public.sermons
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sermons" on public.sermons;
create policy "Users can update their own sermons"
on public.sermons
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own sermons" on public.sermons;
create policy "Users can delete their own sermons"
on public.sermons
for delete
using (auth.uid() = user_id);

drop trigger if exists set_sermons_updated_at on public.sermons;
create trigger set_sermons_updated_at
before update on public.sermons
for each row
execute function public.set_current_timestamp_updated_at();
