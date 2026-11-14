import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { Badge, Flash, PageHeader } from "@/components/ui/page";
import { CheckboxField, ConfirmForm, Field, Form, SubmitButton, TextareaField } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import { one } from "@/app/admin/_data";
import { createChapter, createLesson, deleteChapter, deleteCourse, updateCourse } from "../actions";

type Lesson = { id: string; title: string; is_published: boolean; position: number; documents: unknown };
type Chapter = { id: string; title: string; position: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  subject: { name: string; class: { id: string; name: string } | null } | null;
  chapters: Chapter[];
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

export default async function TeacherCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const c = t.teacher.courses;

  const { data } = await supabase
    .from("courses")
    .select(
      "id, title, description, is_published, subject:subjects(name, class:classes(id, name)), chapters(id, title, position, lessons(id, title, is_published, position, documents(count)))",
    )
    .eq("id", id)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!data) notFound();

  const course = data as unknown as Course;
  const subject = one(course.subject);
  const klass = one(subject?.class);
  const chapters = [...(course.chapters ?? [])].sort(byPosition);

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={[klass?.name, subject?.name].filter(Boolean).join(" · ")}
        back={{ href: "/teacher/courses", label: c.title }}
        actions={<Badge tone={course.is_published ? "teal" : "slate"}>{course.is_published ? c.online : c.draft}</Badge>}
      />
      <Flash message={ok === "created" ? c.createdOk : null} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {chapters.length === 0 && (
            <section className="card p-5">
              <EmptyState text={c.noChapter} />
            </section>
          )}

          {chapters.map((ch, i) => {
            const lessons = [...(ch.lessons ?? [])].sort(byPosition);
            return (
              <section key={ch.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="section-title">
                    {i + 1}. {ch.title}
                  </h2>
                  <ConfirmForm action={deleteChapter} confirmMessage={c.deleteChapterConfirm}>
                    <input type="hidden" name="id" value={ch.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <button type="submit" className="btn-ghost-danger" aria-label={t.common.delete}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </ConfirmForm>
                </div>

                {lessons.length === 0 ? (
                  <p className="mb-3 text-sm text-slate-500">{c.noLesson}</p>
                ) : (
                  <ul className="mb-3 divide-y divide-slate-100">
                    {lessons.map((l) => {
                      const files = (l.documents as { count: number }[] | null)?.[0]?.count ?? 0;
                      return (
                        <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          <Link href={`/teacher/lessons/${l.id}`} className="link min-w-0 flex-1 truncate">
                            {l.title}
                          </Link>
                          {files > 0 && <span className="text-xs text-slate-500">{files} 📎</span>}
                          {!l.is_published && <Badge>{c.draft}</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <Form action={createLesson.bind(null, ch.id)}>
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label={c.newLesson} name="title" placeholder={c.lessonTitle} className="min-w-[200px] flex-1" />
                    <SubmitButton variant="secondary" pendingLabel={t.common.saving}>
                      <Plus className="h-4 w-4" aria-hidden />
                      {t.common.create}
                    </SubmitButton>
                  </div>
                </Form>
              </section>
            );
          })}

          <section className="card p-5">
            <Form action={createChapter.bind(null, course.id)} resetOnSuccess>
              <div className="flex flex-wrap items-end gap-2">
                <Field label={c.newChapter} name="title" placeholder={c.chapterTitle} required className="min-w-[200px] flex-1" />
                <SubmitButton pendingLabel={t.common.saving}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {c.newChapter}
                </SubmitButton>
              </div>
            </Form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card h-fit p-5">
            <h2 className="section-title mb-4">{c.settings}</h2>
            <Form action={updateCourse.bind(null, course.id)}>
              <Field label={c.courseTitle} name="title" required defaultValue={course.title} />
              <TextareaField label={c.description} name="description" defaultValue={course.description} />
              <CheckboxField label={c.published} name="is_published" defaultChecked={course.is_published} />
              <SubmitButton pendingLabel={t.common.saving} className="w-full">
                {t.common.save}
              </SubmitButton>
            </Form>
          </section>

          <ConfirmForm action={deleteCourse} confirmMessage={c.deleteConfirm}>
            <input type="hidden" name="id" value={course.id} />
            <button type="submit" className="btn-ghost-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.common.delete}
            </button>
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
