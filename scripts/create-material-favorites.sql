create table if not exists public.material_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'material_favorites_user_material_key'
  ) then
    alter table public.material_favorites
      add constraint material_favorites_user_material_key unique (user_id, material_id);
  end if;
end $$;

create index if not exists material_favorites_user_created_idx
  on public.material_favorites (user_id, created_at desc);

create index if not exists material_favorites_material_idx
  on public.material_favorites (material_id);
