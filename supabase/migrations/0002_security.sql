-- =============================================================================
-- EduPlatform — 0002 : sécurité (fonctions d'accès, triggers de protection, RLS)
-- Principe : la base refuse tout ce qui n'est pas explicitement autorisé.
-- Le frontend n'est jamais la seule barrière.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fonctions d'accès (security definer : évitent la récursion RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role = 'super_admin' and status = 'active');
$$;

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role = 'teacher' and status = 'active');
$$;

create or replace function public.is_student() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role = 'student' and status = 'active');
$$;

-- L'enseignant connecté est-il titulaire de cette classe ?
create or replace function public.is_class_teacher(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_teacher()
     and exists (select 1 from classes where id = p_class and teacher_id = auth.uid());
$$;

-- L'élève connecté (actif) est-il inscrit dans cette classe ?
create or replace function public.is_enrolled(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_student()
     and exists (select 1 from enrollments where class_id = p_class and student_id = auth.uid());
$$;

create or replace function public.owns_subject(p_subject uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_teacher()
     and exists (select 1 from subjects where id = p_subject and teacher_id = auth.uid());
$$;

create or replace function public.student_can_view_subject(p_subject uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from subjects s where s.id = p_subject and public.is_enrolled(s.class_id));
$$;

create or replace function public.student_can_view_course(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from courses c join subjects s on s.id = c.subject_id
    where c.id = p_course and c.is_published and public.is_enrolled(s.class_id));
$$;

create or replace function public.student_can_view_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lessons l join chapters ch on ch.id = l.chapter_id
    where l.id = p_lesson and l.is_published and public.student_can_view_course(ch.course_id));
$$;

-- Lien pédagogique enseignant ↔ élève (dans les deux sens)
create or replace function public.shares_class(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes c join enrollments e on e.class_id = c.id
    where (c.teacher_id = auth.uid() and e.student_id = p_other)
       or (c.teacher_id = p_other    and e.student_id = auth.uid()));
$$;

create or replace function public.owns_exam(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_teacher()
     and exists (select 1 from exams where id = p_exam and teacher_id = auth.uid());
$$;

create or replace function public.can_start_exam(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from exams e join subjects s on s.id = e.subject_id
    where e.id = p_exam
      and e.is_published
      and public.is_enrolled(s.class_id)
      and (e.starts_at is null or now() >= e.starts_at)
      and (e.ends_at   is null or now() <= e.ends_at)
      and (select count(*) from exam_attempts a
           where a.exam_id = e.id and a.student_id = auth.uid()) < e.max_attempts);
$$;

-- Normalise une réponse à choix en tableau trié (["a","c"])
create or replace function public.normalize_choice(p jsonb) returns jsonb
language sql immutable as $$
  select coalesce(
    (select jsonb_agg(v order by v)
     from jsonb_array_elements_text(
       case jsonb_typeof(p)
         when 'array'  then p
         when 'string' then jsonb_build_array(p)
         else '[]'::jsonb
       end) as t(v)),
    '[]'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- Triggers de protection
-- Les requêtes du client tournent avec le rôle Postgres "authenticated".
-- Les fonctions security definer et le service_role ne sont pas concernés.
-- ---------------------------------------------------------------------------

-- Un utilisateur ne peut pas changer son propre rôle, statut ou établissement.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security invoker as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.role      := old.role;
    new.status    := old.status;
    new.school_id := old.school_id;
    new.email     := old.email;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Un élève ne peut pas s'attribuer une note sur son devoir.
create or replace function public.protect_submission_grading()
returns trigger language plpgsql security invoker as $$
declare v_is_grader boolean;
begin
  if current_user <> 'authenticated' then return new; end if;
  select public.is_admin() or exists (
    select 1 from assignments a where a.id = new.assignment_id and a.teacher_id = auth.uid())
  into v_is_grader;

  if not v_is_grader then
    if tg_op = 'INSERT' then
      new.score := null; new.feedback := null; new.graded_at := null; new.graded_by := null;
      if new.status not in ('draft', 'submitted') then new.status := 'draft'; end if;
    else
      new.score := old.score; new.feedback := old.feedback;
      new.graded_at := old.graded_at; new.graded_by := old.graded_by;
      new.assignment_id := old.assignment_id; new.student_id := old.student_id;
    end if;
    if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
      new.submitted_at := now();
    elsif tg_op = 'UPDATE' then
      new.submitted_at := old.submitted_at;
    end if;
  else
    if new.score is not null and (tg_op = 'INSERT' or old.score is distinct from new.score) then
      new.graded_at := now();
      new.graded_by := auth.uid();
    end if;
  end if;
  return new;
end $$;
create trigger submissions_protect before insert or update on public.submissions
  for each row execute function public.protect_submission_grading();

-- Tentative d'examen : horodatage et échéance fixés par le serveur.
create or replace function public.protect_exam_attempt()
returns trigger language plpgsql security invoker as $$
declare v_duration integer;
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_op = 'INSERT' then
    select duration_minutes into v_duration from exams where id = new.exam_id;
    new.status := 'in_progress';
    new.started_at := now();
    new.deadline_at := case when v_duration is null then null
                            else now() + make_interval(mins => v_duration) end;
    new.submitted_at := null; new.score := null; new.max_score := null; new.graded_at := null;
  elsif not (public.is_admin() or public.owns_exam(old.exam_id)) then
    raise exception 'forbidden' using errcode = '42501';
  else
    new.exam_id := old.exam_id; new.student_id := old.student_id;
    new.started_at := old.started_at; new.deadline_at := old.deadline_at;
  end if;
  return new;
end $$;
create trigger exam_attempts_protect before insert or update on public.exam_attempts
  for each row execute function public.protect_exam_attempt();

-- Réponses : l'élève ne peut pas renseigner la correction.
create or replace function public.protect_answer_grading()
returns trigger language plpgsql security invoker as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if not (public.is_admin() or exists (
      select 1 from exam_attempts a where a.id = new.attempt_id and public.owns_exam(a.exam_id))) then
    if tg_op = 'INSERT' then
      new.is_correct := null; new.points_awarded := null; new.feedback := null;
    else
      new.is_correct := old.is_correct; new.points_awarded := old.points_awarded;
      new.feedback := old.feedback; new.attempt_id := old.attempt_id;
      new.question_id := old.question_id; new.student_id := old.student_id;
    end if;
  else
    -- le correcteur ne modifie que la correction
    if tg_op = 'UPDATE' then new.response := old.response; end if;
  end if;
  return new;
end $$;
create trigger answers_protect before insert or update on public.answers
  for each row execute function public.protect_answer_grading();

-- Messages : seul read_at est modifiable après envoi.
create or replace function public.protect_message()
returns trigger language plpgsql security invoker as $$
begin
  if current_user = 'authenticated' then
    new.body := old.body; new.sender_id := old.sender_id;
    new.recipient_id := old.recipient_id; new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger messages_protect before update on public.messages
  for each row execute function public.protect_message();

-- ---------------------------------------------------------------------------
-- Soumission d'un examen : correction automatique des questions à choix
-- ---------------------------------------------------------------------------
create or replace function public.submit_exam_attempt(p_attempt uuid)
returns public.exam_attempts
language plpgsql security definer set search_path = public as $$
declare
  v_attempt  exam_attempts;
  v_has_free boolean;
  v_score    numeric;
  v_max      numeric;
begin
  select * into v_attempt from exam_attempts where id = p_attempt for update;
  if not found or v_attempt.student_id <> auth.uid() then
    raise exception 'attempt_not_found' using errcode = '42501';
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'attempt_already_submitted' using errcode = '22023';
  end if;

  update answers a set
    is_correct = (normalize_choice(a.response) = normalize_choice(k.correct_options)
                  and normalize_choice(k.correct_options) <> '[]'::jsonb),
    points_awarded = case
      when normalize_choice(a.response) = normalize_choice(k.correct_options)
       and normalize_choice(k.correct_options) <> '[]'::jsonb then q.points
      else 0 end
  from questions q join question_keys k on k.question_id = q.id
  where a.attempt_id = p_attempt and a.question_id = q.id and q.type <> 'free_text';

  select exists (select 1 from questions where exam_id = v_attempt.exam_id and type = 'free_text')
    into v_has_free;
  select coalesce(sum(points), 0) into v_max from questions where exam_id = v_attempt.exam_id;
  select coalesce(sum(points_awarded), 0) into v_score from answers where attempt_id = p_attempt;

  update exam_attempts set
    status       = case when v_has_free then 'submitted'::attempt_status else 'graded'::attempt_status end,
    submitted_at = now(),
    score        = v_score,
    max_score    = v_max,
    graded_at    = case when v_has_free then null else now() end
  where id = p_attempt
  returning * into v_attempt;

  return v_attempt;
end $$;

-- Journalisation : l'acteur est toujours l'utilisateur connecté
create or replace function public.log_action(
  p_action text, p_entity text, p_entity_id text default null, p_metadata jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- Droits d'exécution
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Activation RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'schools','profiles','teachers','students','classes','subjects','enrollments',
    'courses','chapters','lessons','documents','videos','assignments','submissions',
    'exams','questions','question_keys','exam_attempts','answers','grades',
    'messages','notifications','meetings','meeting_participants','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())',
                   t || '_admin_all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Politiques par table (en plus de l'accès global du super admin)
-- ---------------------------------------------------------------------------

-- schools : lecture pour tout utilisateur connecté
create policy schools_read on public.schools for select to authenticated
  using (auth.uid() is not null);

-- profiles
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_class(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- teachers / students : fiche propre + relation pédagogique
create policy teachers_read on public.teachers for select to authenticated
  using (id = auth.uid() or public.shares_class(id));
create policy teachers_update_self on public.teachers for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy students_read on public.students for select to authenticated
  using (id = auth.uid() or public.shares_class(id));
create policy students_update_self on public.students for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- classes
create policy classes_teacher on public.classes for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());
create policy classes_student_read on public.classes for select to authenticated
  using (public.is_enrolled(id));

-- subjects
create policy subjects_teacher on public.subjects for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_class_teacher(class_id));
create policy subjects_student_read on public.subjects for select to authenticated
  using (public.is_enrolled(class_id));

-- enrollments
create policy enrollments_teacher on public.enrollments for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy enrollments_student_read on public.enrollments for select to authenticated
  using (student_id = auth.uid() and public.is_student());

-- courses
create policy courses_teacher on public.courses for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.owns_subject(subject_id));
create policy courses_student_read on public.courses for select to authenticated
  using (public.student_can_view_course(id));

-- chapters
create policy chapters_teacher on public.chapters for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher() and exists (
    select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()));
create policy chapters_student_read on public.chapters for select to authenticated
  using (public.student_can_view_course(course_id));

-- lessons
create policy lessons_teacher on public.lessons for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher() and exists (
    select 1 from public.chapters ch where ch.id = chapter_id and ch.teacher_id = auth.uid()));
create policy lessons_student_read on public.lessons for select to authenticated
  using (public.student_can_view_lesson(id));

-- documents / videos
create policy documents_teacher on public.documents for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher() and exists (
    select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid()));
create policy documents_student_read on public.documents for select to authenticated
  using (public.student_can_view_lesson(lesson_id));

create policy videos_teacher on public.videos for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher() and exists (
    select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid()));
create policy videos_student_read on public.videos for select to authenticated
  using (public.student_can_view_lesson(lesson_id));

-- assignments
create policy assignments_teacher on public.assignments for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.owns_subject(subject_id));
create policy assignments_student_read on public.assignments for select to authenticated
  using (is_published and public.student_can_view_subject(subject_id));

-- submissions
create policy submissions_teacher_read on public.submissions for select to authenticated
  using (public.is_teacher() and exists (
    select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy submissions_teacher_grade on public.submissions for update to authenticated
  using (public.is_teacher() and exists (
    select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()))
  with check (public.is_teacher() and exists (
    select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy submissions_student_read on public.submissions for select to authenticated
  using (student_id = auth.uid() and public.is_student());
create policy submissions_student_insert on public.submissions for insert to authenticated
  with check (student_id = auth.uid() and exists (
    select 1 from public.assignments a
    where a.id = assignment_id and a.is_published
      and public.student_can_view_subject(a.subject_id)
      and (a.allow_late or a.due_at is null or now() <= a.due_at)));
create policy submissions_student_update on public.submissions for update to authenticated
  using (student_id = auth.uid() and public.is_student() and status = 'draft')
  with check (student_id = auth.uid() and status in ('draft', 'submitted') and exists (
    select 1 from public.assignments a
    where a.id = assignment_id and (a.allow_late or a.due_at is null or now() <= a.due_at)));

-- exams
create policy exams_teacher on public.exams for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.owns_subject(subject_id));
create policy exams_student_read on public.exams for select to authenticated
  using (is_published and public.student_can_view_subject(subject_id));

-- questions : l'élève ne voit les questions qu'après avoir démarré une tentative
create policy questions_teacher on public.questions for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.owns_exam(exam_id));
create policy questions_student_read on public.questions for select to authenticated
  using (public.is_student() and exists (
    select 1 from public.exam_attempts a
    where a.exam_id = questions.exam_id and a.student_id = auth.uid()));

-- question_keys : enseignant propriétaire uniquement
create policy question_keys_teacher on public.question_keys for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and exists (
    select 1 from public.questions q where q.id = question_id and q.teacher_id = auth.uid()));

-- exam_attempts
create policy attempts_teacher_read on public.exam_attempts for select to authenticated
  using (public.owns_exam(exam_id));
create policy attempts_teacher_update on public.exam_attempts for update to authenticated
  using (public.owns_exam(exam_id)) with check (public.owns_exam(exam_id));
create policy attempts_student_read on public.exam_attempts for select to authenticated
  using (student_id = auth.uid() and public.is_student());
create policy attempts_student_start on public.exam_attempts for insert to authenticated
  with check (student_id = auth.uid() and public.can_start_exam(exam_id));

-- answers
create policy answers_teacher_read on public.answers for select to authenticated
  using (exists (select 1 from public.exam_attempts a
                 where a.id = attempt_id and public.owns_exam(a.exam_id)));
create policy answers_teacher_grade on public.answers for update to authenticated
  using (exists (select 1 from public.exam_attempts a
                 where a.id = attempt_id and public.owns_exam(a.exam_id)))
  with check (exists (select 1 from public.exam_attempts a
                      where a.id = attempt_id and public.owns_exam(a.exam_id)));
create policy answers_student_read on public.answers for select to authenticated
  using (student_id = auth.uid() and public.is_student());
create policy answers_student_write on public.answers for insert to authenticated
  with check (student_id = auth.uid() and exists (
    select 1 from public.exam_attempts a join public.questions q on q.exam_id = a.exam_id
    where a.id = attempt_id and q.id = question_id and a.student_id = auth.uid()
      and a.status = 'in_progress'
      and (a.deadline_at is null or now() <= a.deadline_at + interval '30 seconds')));
create policy answers_student_update on public.answers for update to authenticated
  using (student_id = auth.uid() and exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and a.student_id = auth.uid() and a.status = 'in_progress'
      and (a.deadline_at is null or now() <= a.deadline_at + interval '30 seconds')))
  with check (student_id = auth.uid());

-- grades
create policy grades_teacher on public.grades for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.owns_subject(subject_id) and exists (
    select 1 from public.subjects s join public.enrollments e on e.class_id = s.class_id
    where s.id = subject_id and e.student_id = grades.student_id));
create policy grades_student_read on public.grades for select to authenticated
  using (student_id = auth.uid() and is_published and public.is_student());

-- messages : uniquement entre personnes liées par une classe
create policy messages_read on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy messages_send on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.shares_class(recipient_id)
              and (public.is_teacher() or public.is_student()));
create policy messages_mark_read on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy messages_delete_own on public.messages for delete to authenticated
  using (sender_id = auth.uid());

-- notifications
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid());
create policy notifications_teacher_send on public.notifications for insert to authenticated
  with check (public.is_teacher() and public.shares_class(user_id));

-- meetings
create policy meetings_teacher on public.meetings for all to authenticated
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_class_teacher(class_id));
create policy meetings_student_read on public.meetings for select to authenticated
  using (public.is_enrolled(class_id));

-- meeting_participants
create policy participants_read on public.meeting_participants for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.meetings m where m.id = meeting_id and m.teacher_id = auth.uid()));
create policy participants_join on public.meeting_participants for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.meetings m where m.id = meeting_id
      and m.status in ('scheduled', 'live')
      and (m.teacher_id = auth.uid() or public.is_enrolled(m.class_id))));
create policy participants_leave on public.meeting_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs : écriture via log_action() uniquement, lecture admin (politique globale)
