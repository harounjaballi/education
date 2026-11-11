-- =============================================================================
-- EduPlatform — 0004 : paramètres de la plateforme et niveaux scolaires
-- =============================================================================

create table public.levels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 80),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Ligne unique (id = true)
create table public.platform_settings (
  id              boolean primary key default true check (id),
  platform_name   text not null default 'EduPlatform' check (char_length(platform_name) between 2 and 80),
  academic_year   text not null default '2026-2027' check (academic_year ~ '^\d{4}-\d{4}$'),
  support_email   text check (support_email is null or support_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  default_locale  text not null default 'fr' check (default_locale in ('fr', 'ar')),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null
);

insert into public.platform_settings default values;

insert into public.levels (name, position) values
  ('1ère année', 1), ('2ème année', 2), ('3ème année', 3), ('4ème année', 4);

create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.levels enable row level security;
alter table public.platform_settings enable row level security;

create policy levels_admin_all on public.levels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy levels_read on public.levels for select to authenticated
  using (auth.uid() is not null);

create policy platform_settings_admin_all on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy platform_settings_read on public.platform_settings for select to authenticated
  using (auth.uid() is not null);
