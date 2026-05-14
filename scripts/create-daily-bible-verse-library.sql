create table if not exists public.daily_bible_verse_library (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  theme text not null default 'geral',
  book text not null,
  abbrev text,
  chapter integer not null,
  verse integer not null,
  reference text not null,
  text text not null,
  insight text not null,
  display_order integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_bible_verse_library
  add column if not exists theme text not null default 'geral';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_bible_verse_library_reference_key'
  ) then
    alter table public.daily_bible_verse_library
      add constraint daily_bible_verse_library_reference_key unique (reference);
  end if;
end $$;

create index if not exists daily_bible_verse_library_active_order_idx
  on public.daily_bible_verse_library (is_active, display_order, reference);

create index if not exists daily_bible_verse_library_theme_idx
  on public.daily_bible_verse_library (theme, is_active, display_order);

alter table public.daily_bible_verse_library enable row level security;
