import { notFound } from "next/navigation";
import { PlayCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { CheckboxField, ConfirmForm, Field, Form, SubmitButton, TextareaField } from "@/components/ui/form";
import { formatSize } from "@/lib/media";
import { one } from "@/app/admin/_data";
import { addVideo, deleteDocument, deleteLesson, deleteVideo, updateLesson } from "../../courses/actions";
import { DocumentUpload } from "./document-upload";

type Lesson = {
  id: string;
  title: string;
  content: string | null;
  is_published: boolean;
  chapter: { title: string; course: { id: string; title: string } | null } | null;
  documents: { id: string; name: string; storage_path: string; size_bytes: number | null; created_at: string }[];
  videos: { id: string; title: string; url: string | null; created_at: string }[];
};

export default async function TeacherLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const l = t.teacher.lessons;

  const { data } = await supabase
    .from("lessons")
    .select(
      "id, title, content, is_published, chapter:chapters(title, course:courses(id, title)), documents(id, name, storage_path, size_bytes, created_at), videos(id, title, url, created_at)",
    )
    .eq("id", id)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!data) notFound();

  const lesson = data as unknown as Lesson;
  const chapter = one(lesson.chapter);
  const course = one(chapter?.course);
  const documents = [...(lesson.documents ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const videos = [...(lesson.videos ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Liens de téléchargement temporaires (1 h) : le bucket est privé.
  const signed = documents.length
    ? (await supabase.storage.from("course-files").createSignedUrls(documents.map((d) => d.storage_path), 3600)).data ?? []
    : [];
  const urlOf = (path: string) => signed.find((s) => s.path === path)?.signedUrl ?? null;

  return (
    <>
      <PageHeader
        title={lesson.title}
        subtitle={[course?.title, chapter?.title].filter(Boolean).join(" · ")}
        back={course ? { href: `/teacher/courses/${course.id}`, label: l.backToCourse } : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <Form action={updateLesson.bind(null, lesson.id)}>
              <Field label={t.teacher.courses.lessonTitle} name="title" required defaultValue={lesson.title} />
              <TextareaField label={l.content} name="content" rows={14} hint={l.contentHint} defaultValue={lesson.content} />
              <CheckboxField label={l.published} name="is_published" defaultChecked={lesson.is_published} />
              <div className="flex justify-end">
                <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
              </div>
            </Form>
          </section>

          <ConfirmForm action={deleteLesson} confirmMessage={l.deleteConfirm}>
            <input type="hidden" name="id" value={lesson.id} />
            <button type="submit" className="btn-ghost-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.common.delete}
            </button>
          </ConfirmForm>
        </div>

        <div className="space-y-6">
          <section className="card h-fit p-5">
            <h2 className="section-title mb-1">{l.files}</h2>
            <p className="mb-4 text-xs text-slate-500">{l.filesHelp}</p>
            {documents.length > 0 && (
              <ul className="mb-4 divide-y divide-slate-100">
                {documents.map((d) => {
                  const url = urlOf(d.storage_path);
                  return (
                    <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="link block truncate">
                            {d.name}
                          </a>
                        ) : (
                          <span className="block truncate">{d.name}</span>
                        )}
                        <p className="text-xs text-slate-500" dir="ltr">
                          {formatSize(d.size_bytes)}
                        </p>
                      </div>
                      <ConfirmForm action={deleteDocument} confirmMessage={l.deleteFileConfirm}>
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" className="btn-ghost-danger" aria-label={`${t.common.delete} ${d.name}`}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </ConfirmForm>
                    </li>
                  );
                })}
              </ul>
            )}
            <DocumentUpload
              teacherId={profile.id}
              lessonId={lesson.id}
              labels={{
                upload: l.upload,
                uploading: l.uploading,
                uploadError: l.uploadError,
                badType: l.badType,
                tooBig: l.tooBig,
              }}
            />
          </section>

          <section className="card h-fit p-5">
            <h2 className="section-title mb-4">{l.videos}</h2>
            {videos.length > 0 && (
              <ul className="mb-4 divide-y divide-slate-100">
                {videos.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 py-2 text-sm">
                    <PlayCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <a href={v.url ?? "#"} target="_blank" rel="noreferrer" className="link min-w-0 flex-1 truncate">
                      {v.title}
                    </a>
                    <ConfirmForm action={deleteVideo} confirmMessage={l.deleteVideoConfirm}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="lesson_id" value={lesson.id} />
                      <button type="submit" className="btn-ghost-danger" aria-label={`${t.common.delete} ${v.title}`}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </ConfirmForm>
                  </li>
                ))}
              </ul>
            )}
            <Form action={addVideo.bind(null, lesson.id)} resetOnSuccess>
              <Field label={l.videoTitle} name="title" required />
              <Field label={l.videoUrl} name="url" type="url" required dir="ltr" placeholder="https://www.youtube.com/watch?v=…" />
              <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="w-full">
                {l.addVideo}
              </SubmitButton>
            </Form>
          </section>
        </div>
      </div>
    </>
  );
}
