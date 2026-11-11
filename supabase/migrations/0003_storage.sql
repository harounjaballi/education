-- =============================================================================
-- EduPlatform — 0003 : Supabase Storage (buckets privés + politiques)
-- Conventions de chemins :
--   course-files/{teacher_id}/{lesson_id|assignment_id}/{fichier}
--   submissions/{student_id}/{assignment_id}/{fichier}
--   avatars/{user_id}/{fichier}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('course-files', 'course-files', false, 524288000, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]),
  ('submissions', 'submissions', false, 52428800, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png', 'image/jpeg', 'image/webp',
    'application/zip', 'text/plain'
  ]),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ---------- course-files ----------
create policy "course_files_teacher_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_teacher()
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "course_files_teacher_update" on storage.objects for update to authenticated
  using (bucket_id = 'course-files' and (storage.foldername(name))[1] = auth.uid()::text
         and public.is_teacher());

create policy "course_files_teacher_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and (storage.foldername(name))[1] = auth.uid()::text
         and public.is_teacher());

create policy "course_files_read" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and (
    public.is_admin()
    or ((storage.foldername(name))[1] = auth.uid()::text and public.is_teacher())
    or exists (select 1 from public.documents d
               where d.storage_path = name and public.student_can_view_lesson(d.lesson_id))
    or exists (select 1 from public.videos v
               where v.storage_path = name and public.student_can_view_lesson(v.lesson_id))
    or exists (select 1 from public.assignments a
               where a.attachment_path = name and a.is_published
                 and public.student_can_view_subject(a.subject_id))
  ));

-- ---------- submissions ----------
create policy "submissions_student_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.is_student()
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions_student_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and public.is_student()
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "submissions_read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.assignments a
               where a.id::text = (storage.foldername(name))[2]
                 and a.teacher_id = auth.uid() and public.is_teacher())
  ));

-- ---------- avatars (lecture publique) ----------
create policy "avatars_write_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
