-- =============================================================================
-- EduPlatform — 0006 : fil d'actualité de chaque classe
-- À exécuter une fois dans Supabase → SQL Editor.
-- =============================================================================

create table if not exists public.class_posts (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  kind        text not null default 'info' check (kind in ('info', 'grades', 'homework', 'important')),
  title       text check (title is null or char_length(title) <= 200),
  body        text not null check (char_length(body) between 1 and 10000),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists class_posts_class_idx on public.class_posts(class_id, created_at desc);

drop trigger if exists class_posts_updated_at on public.class_posts;
create trigger class_posts_updated_at before update on public.class_posts
  for each row execute function public.set_updated_at();

alter table public.class_posts enable row level security;

drop policy if exists class_posts_admin_all on public.class_posts;
create policy class_posts_admin_all on public.class_posts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- L'enseignant publie et gère les messages de ses propres classes.
drop policy if exists class_posts_teacher on public.class_posts;
create policy class_posts_teacher on public.class_posts for all to authenticated
  using (teacher_id = auth.uid() and public.is_class_teacher(class_id))
  with check (teacher_id = auth.uid() and public.is_class_teacher(class_id));

-- Les élèves lisent le fil des classes où ils sont inscrits.
drop policy if exists class_posts_student_read on public.class_posts;
create policy class_posts_student_read on public.class_posts for select to authenticated
  using (public.is_enrolled(class_id));
