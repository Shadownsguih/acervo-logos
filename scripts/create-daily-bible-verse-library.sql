create table if not exists public.daily_bible_verse_library (
  id uuid primary key default gen_random_uuid(),
  source text,
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
  add column if not exists source text;

alter table public.daily_bible_verse_library
  add column if not exists theme text not null default 'geral';

alter table public.daily_bible_verse_library
  add column if not exists prayer text;

alter table public.daily_bible_verse_library
  add column if not exists closing_thought text;

alter table public.daily_bible_verse_library
  drop constraint if exists daily_bible_verse_library_reference_key;

create index if not exists daily_bible_verse_library_active_order_idx
  on public.daily_bible_verse_library (is_active, display_order, reference);

create index if not exists daily_bible_verse_library_theme_idx
  on public.daily_bible_verse_library (theme, is_active, display_order);

alter table public.daily_bible_verse_library enable row level security;

create table if not exists public.daily_bible_verse_refresh_state (
  date_key text primary key,
  refresh_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.daily_bible_verse_refresh_state enable row level security;

create table if not exists public.daily_bible_verse_source_override (
  date_key text primary key,
  forced_source text not null,
  updated_at timestamptz not null default now()
);

alter table public.daily_bible_verse_source_override enable row level security;

create or replace function public.refresh_daily_devotional(
  target_date text default to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD')
)
returns table (
  date_key text,
  refresh_count integer,
  updated_at timestamptz
)
language sql
security definer
as $$
  insert into public.daily_bible_verse_refresh_state as refresh_state (
    date_key,
    refresh_count,
    updated_at
  )
  values (
    target_date,
    1,
    now()
  )
  on conflict (date_key) do update
    set refresh_count = refresh_state.refresh_count + 1,
        updated_at = now()
  returning
    refresh_state.date_key,
    refresh_state.refresh_count,
    refresh_state.updated_at;
$$;

create or replace function public.reset_daily_devotional_refresh(
  target_date text default to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD')
)
returns table (
  date_key text,
  refresh_count integer,
  updated_at timestamptz
)
language sql
security definer
as $$
  insert into public.daily_bible_verse_refresh_state as refresh_state (
    date_key,
    refresh_count,
    updated_at
  )
  values (
    target_date,
    0,
    now()
  )
  on conflict (date_key) do update
    set refresh_count = 0,
        updated_at = now()
  returning
    refresh_state.date_key,
    refresh_state.refresh_count,
    refresh_state.updated_at;
$$;

create or replace function public.force_daily_devotional_source(
  target_date text,
  target_source text
)
returns table (
  date_key text,
  forced_source text,
  updated_at timestamptz
)
language sql
security definer
as $$
  insert into public.daily_bible_verse_source_override as source_override (
    date_key,
    forced_source,
    updated_at
  )
  values (
    target_date,
    target_source,
    now()
  )
  on conflict (date_key) do update
    set forced_source = excluded.forced_source,
        updated_at = now()
  returning
    source_override.date_key,
    source_override.forced_source,
    source_override.updated_at;
$$;

create or replace function public.clear_daily_devotional_source_override(
  target_date text
)
returns table (
  date_key text,
  forced_source text,
  updated_at timestamptz
)
language sql
security definer
as $$
  delete from public.daily_bible_verse_source_override as source_override
  where source_override.date_key = target_date
  returning
    source_override.date_key,
    source_override.forced_source,
    source_override.updated_at;
$$;
