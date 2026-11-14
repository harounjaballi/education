import { notFound } from "next/navigation";
import { FileText, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { embedUrl, formatSize } from "@/lib/media";
import { one } from "@/app/admin/_data";

type Lesson = {
  id: string;
  title: string;
  content: string | null;
  chapter: { title: string; course: { id: string; title: string } | null } | null;
  documents: { id: string; name: string; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string }[];
  videos: { id: string; title: string; url: string | null; created_at: string }[];
};

export default async function StudentLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getDictionary();
  const c = t.student.courses;

  // RLS : leçon publiée d'un cours publié d'une classe de l'élève, sinon rien.
  const { data } = await supabase
    .from("lessons")
    .select(
      "id, title, content, chapter:chapters(title, course:courses(id, title)), documents(id, name, storage_path, mime_type, size_bytes, created_at), videos(id, title, url, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const lesson = data as unknown as Lesson;
  const chapter = one(lesson.chapter);
  const course = one(chapter?.course);
  const documents = [...(lesson.documents ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const videos = [...(lesson.videos ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const signed = documents.length
    ? (await supabase.storage.from("course-files").createSignedUrls(documents.map((d) => d.storage_path), 3600)).data ?? []
    : [];
  const urlOf = (path: string) => signed.find((s) => s.path === path)?.signedUrl ?? null;

  return (
    <>
      <PageHeader
        title={lesson.title}
        subtitle={[course?.title, chapter?.title].filter(Boolean).join(" · ")}
        back={course ? { href: `/student/courses/${course.id}`, label: c.backToCourse } : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {lesson.content && (
            <article className="card whitespace-pre-line p-5 text-[15px] leading-7 text-navy-900 sm:p-6">{lesson.content}</article>
          )}

          {videos.map((v) => {
            const embed = v.url ? embedUrl(v.url) : null;
            return (
              <section key={v.id} className="card overflow-hidden">
                {embed ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={embed}
                      title={v.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <a
                  href={v.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-navy-900 hover:text-teal-700"
                >
                  <PlayCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {v.title}
                </a>
              </section>
            );
          })}
        </div>

        {documents.length > 0 && (
          <section className="card h-fit p-5">
            <h2 className="section-title mb-3">{c.files}</h2>
            <ul className="divide-y divide-slate-100">
              {documents.map((d) => {
                const url = urlOf(d.storage_path);
                return (
                  <li key={d.id} className="py-2">
                    <a
                      href={url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 text-sm hover:text-teal-700"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.name}</span>
                        <span className="text-xs text-slate-500" dir="ltr">
                          {formatSize(d.size_bytes)}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
