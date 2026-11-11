-- =============================================================================
-- EduPlatform — 0001 : schéma relationnel
-- Hiérarchie : Établissement → Classe → Matière → Cours → Chapitre → Leçon
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------
create type public.user_role         as enum ('super_admin', 'teacher', 'student');
create type public.account_status    as enum ('active', 'suspended', 'disabled');
create type public.submission_status as enum ('draft', 'submitted', 'graded', 'returned');
create type public.exam_kind         as enum ('qcm', 'exam', 'exercise');
create type public.question_type     as enum ('single_choice', 'multiple_choice', 'free_text');
create type public.attempt_status    as enum ('in_progress', 'submitted', 'graded');
create type public.meeting_status    as enum ('scheduled', 'live', 'ended', 'cancelled');
create type public.video_provider    as enum ('upload', 'youtube', 'vimeo', 'external');
create type public.grade_source      as enum ('assignment', 'exam', 'manual');

-- ---------------------------------------------------------------------------
-- Établissements et utilisateurs
-- ---------------------------------------------------------------------------
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 200),
  city        text,
  address     text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'student',
  status      public.account_status not null default 'active',
  full_name   text not null default '',
  email       text not null,
  avatar_url  text,
  locale      text not null default 'fr' check (locale in ('fr', 'ar')),
  school_id   uuid references public.schools(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx   on public.profiles(role);
create index profiles_school_idx on public.profiles(school_id);

create table public.teachers (
  id          uuid primary key references public.profiles(id) on delete cascade,
  specialty   text,
  phone       text,
  bio         text,
  created_at  timestamptz not null default now()
);

create table public.students (
  id              uuid primary key references public.profiles(id) on delete cascade,
  student_code    text unique,
  birth_date      date,
  level           text,
  guardian_phone  text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Organisation pédagogique
-- ---------------------------------------------------------------------------
create table public.classes (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references public.schools(id) on delete set null,
  teacher_id     uuid not null references public.teachers(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  level          text,
  academic_year  text not null default '2026-2027',
  description    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index classes_teacher_idx on public.classes(teacher_id);
create index classes_school_idx  on public.classes(school_id);

create table public.subjects (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  teacher_id   uuid not null references public.teachers(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text,
  color        text not null default '#14B8A6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index subjects_class_idx   on public.subjects(class_id);
create index subjects_teacher_idx on public.subjects(teacher_id);

create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  unique (class_id, student_id)
);
create index enrollments_student_idx on public.enrollments(student_id);

-- ---------------------------------------------------------------------------
-- Contenus pédagogiques
-- ---------------------------------------------------------------------------
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects(id) on delete cascade,
  teacher_id    uuid not null references public.teachers(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  description   text,
  cover_path    text,
  is_published  boolean not null default false,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index courses_subject_idx on public.courses(subject_id);
create index courses_teacher_idx on public.courses(teacher_id);

create table public.chapters (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  teacher_id   uuid not null references public.teachers(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index chapters_course_idx on public.chapters(course_id, position);

create table public.lessons (
  id            uuid primary key default gen_random_uuid(),
  chapter_id    uuid not null references public.chapters(id) on delete cascade,
  teacher_id    uuid not null references public.teachers(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  content       text,
  is_published  boolean not null default false,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index lessons_chapter_idx on public.lessons(chapter_id, position);

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  teacher_id    uuid not null references public.teachers(id) on delete cascade,
  name          text not null,
  storage_path  text not null unique,
  mime_type     text,
  size_bytes    bigint check (size_bytes is null or size_bytes >= 0),
  created_at    timestamptz not null default now()
);
create index documents_lesson_idx on public.documents(lesson_id);

create table public.videos (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  teacher_id        uuid not null references public.teachers(id) on delete cascade,
  title             text not null,
  provider          public.video_provider not null default 'upload',
  url               text,
  storage_path      text unique,
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  created_at        timestamptz not null default now(),
  check (url is not null or storage_path is not null)
);
create index videos_lesson_idx on public.videos(lesson_id);

-- ---------------------------------------------------------------------------
-- Devoirs
-- ---------------------------------------------------------------------------
create table public.assignments (
  id               uuid primary key default gen_random_uuid(),
  subject_id       uuid not null references public.subjects(id) on delete cascade,
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  lesson_id        uuid references public.lessons(id) on delete set null,
  title            text not null check (char_length(title) between 1 and 200),
  instructions     text,
  attachment_path  text,
  due_at           timestamptz,
  max_score        numeric(6,2) not null default 20 check (max_score > 0),
  allow_late       boolean not null default false,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index assignments_subject_idx on public.assignments(subject_id);
create index assignments_due_idx     on public.assignments(due_at);

create table public.submissions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  content        text,
  storage_path   text,
  status         public.submission_status not null default 'draft',
  submitted_at   timestamptz,
  score          numeric(6,2) check (score is null or score >= 0),
  feedback       text,
  graded_at      timestamptz,
  graded_by      uuid references public.teachers(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index submissions_student_idx on public.submissions(student_id);
create index submissions_status_idx  on public.submissions(status);

-- ---------------------------------------------------------------------------
-- Examens / QCM
-- ---------------------------------------------------------------------------
create table public.exams (
  id                 uuid primary key default gen_random_uuid(),
  subject_id         uuid not null references public.subjects(id) on delete cascade,
  teacher_id         uuid not null references public.teachers(id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 200),
  description        text,
  kind               public.exam_kind not null default 'qcm',
  duration_minutes   integer check (duration_minutes is null or duration_minutes between 1 and 600),
  starts_at          timestamptz,
  ends_at            timestamptz,
  max_attempts       integer not null default 1 check (max_attempts between 1 and 20),
  shuffle_questions  boolean not null default false,
  show_results       boolean not null default true,
  is_published       boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index exams_subject_idx on public.exams(subject_id);

-- options : [{"id": "a", "label": "..."}, ...]
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references public.exams(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  type        public.question_type not null,
  prompt      text not null check (char_length(prompt) between 1 and 5000),
  options     jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  points      numeric(6,2) not null default 1 check (points > 0),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index questions_exam_idx on public.questions(exam_id, position);

-- Corrigés séparés : jamais lisibles par les élèves (RLS)
create table public.question_keys (
  question_id      uuid primary key references public.questions(id) on delete cascade,
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  correct_options  jsonb not null default '[]'::jsonb check (jsonb_typeof(correct_options) = 'array'),
  explanation      text
);

create table public.exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references public.exams(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  status        public.attempt_status not null default 'in_progress',
  started_at    timestamptz not null default now(),
  deadline_at   timestamptz,
  submitted_at  timestamptz,
  score         numeric(7,2),
  max_score     numeric(7,2),
  graded_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index exam_attempts_exam_idx    on public.exam_attempts(exam_id);
create index exam_attempts_student_idx on public.exam_attempts(student_id);

create table public.answers (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references public.exam_attempts(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  response        jsonb,
  is_correct      boolean,
  points_awarded  numeric(6,2) check (points_awarded is null or points_awarded >= 0),
  feedback        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
create table public.grades (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  subject_id     uuid not null references public.subjects(id) on delete cascade,
  teacher_id     uuid not null references public.teachers(id) on delete cascade,
  source         public.grade_source not null default 'manual',
  assignment_id  uuid references public.assignments(id) on delete set null,
  exam_id        uuid references public.exams(id) on delete set null,
  title          text not null,
  score          numeric(6,2) not null check (score >= 0),
  max_score      numeric(6,2) not null default 20 check (max_score > 0),
  comment        text,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (score <= max_score)
);
create index grades_student_idx on public.grades(student_id);
create index grades_subject_idx on public.grades(subject_id);

-- ---------------------------------------------------------------------------
-- Communication
-- ---------------------------------------------------------------------------
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 5000),
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index messages_recipient_idx on public.messages(recipient_id, created_at desc);
create index messages_sender_idx    on public.messages(sender_id, created_at desc);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- Visioconférence
-- ---------------------------------------------------------------------------
create table public.meetings (
  id                uuid primary key default gen_random_uuid(),
  teacher_id        uuid not null references public.teachers(id) on delete cascade,
  class_id          uuid not null references public.classes(id) on delete cascade,
  subject_id        uuid references public.subjects(id) on delete set null,
  title             text not null check (char_length(title) between 1 and 200),
  description       text,
  starts_at         timestamptz not null,
  duration_minutes  integer not null default 60 check (duration_minutes between 5 and 480),
  room_name         text not null unique default ('edu-' || replace(gen_random_uuid()::text, '-', '')),
  provider          text not null default 'jitsi' check (provider in ('jitsi', 'livekit')),
  status            public.meeting_status not null default 'scheduled',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index meetings_class_idx  on public.meetings(class_id);
create index meetings_starts_idx on public.meetings(starts_at);

create table public.meeting_participants (
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,
  primary key (meeting_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Journal d'audit
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_idx   on public.audit_logs(actor_id);

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'schools','profiles','classes','subjects','courses','chapters','lessons',
    'assignments','submissions','exams','answers','grades','meetings'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- Le rôle vient de raw_app_meta_data (modifiable uniquement côté serveur),
-- jamais des métadonnées choisies par l'utilisateur.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student');
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_role);

  if v_role = 'teacher' then
    insert into public.teachers (id) values (new.id);
  elsif v_role = 'student' then
    insert into public.students (id) values (new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
