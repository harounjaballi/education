import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/stat-card";
import { one } from "@/app/admin/_data";

type Lesson = { id: string; title: string; position: number };
type Chapter = { id: string; title: string; position: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  description: string | null;
  subject: { name: string } | null;
  chapters: Chapter[];
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getDictionary();
  const c = t.student.courses;

  // RLS : le cours n'est renvoyé que s'il est publié et que l'élève est inscrit ; seules les leçons publiées suivent.
  const { data } = await supabase
    .from("courses")
    .select("id, title, description, subject:subjects(name), chapters(id, title, position, lessons(id, title, position))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const course = data as unknown as Course;
  const chapters = [...(course.chapters ?? [])].sort(byPosition);

  return (
    <>
      <PageHeader title={course.title} subtitle={one(course.subject)?.name} back={{ href: "/student/courses", label: c.title }} />
      {course.description && <p className="mb-6 max-w-3xl whitespace-pre-line text-sm text-slate-600">{course.description}</p>}

      {chapters.length === 0 ? (
        <section className="card p-6">
          <EmptyState text={t.common.empty} />
        </section>
      ) : (
        <div className="space-y-4">
          {chapters.map((ch, i) => {
            const lessons = [...(ch.lessons ?? [])].sort(byPosition);
            return (
              <section key={ch.id} className="card p-5">
                <h2 className="section-title mb-3">
                  {i + 1}. {ch.title}
                </h2>
                {lessons.length === 0 ? (
                  <p className="text-sm text-slate-500">{c.noLesson}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {lessons.map((l) => (
                      <li key={l.id}>
                        <Link href={`/student/lessons/${l.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          <span className="min-w-0 flex-1 truncate font-medium">{l.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
