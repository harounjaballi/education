-- =============================================================================
-- EduPlatform — 0005 : présence en ligne, frais mensuels, paiements des élèves
-- À exécuter une fois dans Supabase → SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Présence : dernière activité de chaque utilisateur
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Appelée par le navigateur toutes les minutes (au plus une écriture / 30 s).
create or replace function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen_at = now()
  where id = auth.uid()
    and (last_seen_at is null or last_seen_at < now() - interval '30 seconds');
$$;
revoke execute on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- ---------------------------------------------------------------------------
-- Paramètres : devise des montants (modifiable par le super admin)
-- ---------------------------------------------------------------------------
alter table public.platform_settings
  add column if not exists currency text not null default 'DT'
  check (char_length(currency) between 1 and 10);

-- ---------------------------------------------------------------------------
-- Frais mensuels d'une classe (fixés par l'enseignant)
-- ---------------------------------------------------------------------------
alter table public.classes
  add column if not exists monthly_fee numeric(10,3)
  check (monthly_fee is null or monthly_fee >= 0);

-- ---------------------------------------------------------------------------
-- Paiements (un paiement = un élève, un mois, un montant)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  class_id    uuid references public.classes(id) on delete set null,
  period      date not null check (period = date_trunc('month', period)::date),
  amount      numeric(10,3) not null check (amount > 0),
  paid_at     date not null default current_date,
  method      text not null default 'cash' check (method in ('cash', 'transfer', 'card', 'other')),
  note        text check (note is null or char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists payments_teacher_period_idx on public.payments(teacher_id, period);
create index if not exists payments_student_idx on public.payments(student_id, period);

alter table public.payments enable row level security;

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- L'enseignant gère les paiements de ses propres élèves.
drop policy if exists payments_teacher on public.payments;
create policy payments_teacher on public.payments for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher() and public.shares_class(student_id)
              and (class_id is null or public.is_class_teacher(class_id)));

-- L'élève consulte ses paiements, sans pouvoir les modifier.
drop policy if exists payments_student_read on public.payments;
create policy payments_student_read on public.payments for select to authenticated
  using (student_id = auth.uid() and public.is_student());
