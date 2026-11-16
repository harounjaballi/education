import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { formatSize } from "@/lib/media";
import { Badge, EmptyRow, PageHeader, Table } from "@/components/ui/page";
import { FileIcon } from "@/components/ui/file-icon";
import { one } from "@/app/admin/_data";

export const metadata = { title: "Mes cours" };

type Row = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  subject: { class: { name: string } | null } | null;
};

type Doc = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  lesson: { chapter: { course_id: string } | null } | null;
};

export default async function TeacherCoursesPage() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const c = t.teacher.courses;

  const [rows, docs] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, description, is_published, subject:subjects(class:classes(name))")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false })
      .then((r) => must(r) as unknown as Row[]),
    supabase
      .from("documents")
      .select("id, name, storage_path, mime_type, size_bytes, created_at, lesson:lessons!inner(chapter:chapters!inner(course_id))")
      .eq("teacher_id", profile.id)
      .order("created_at")
      .then((r) => must(r) as unknown as Doc[]),
  ]);

  // Liens temporaires (1 h) qui forcent le téléchargement avec le nom d'origine du fichier.
  const files = await Promise.all(
    docs.map(async (d) => {
      const { data } = await supabase.storage
        .from("course-files")
        .createSignedUrl(d.storage_path, 3600, { download: d.name });
      return { ...d, courseId: one(one(d.lesson)?.chapter)?.course_id ?? null, url: data?.signedUrl ?? null };
    }),
  );
  const filesOf = (courseId: string) => files.filter((f) => f.courseId === courseId);

  return (
    <>
      <PageHeader
        title={c.title}
        subtitle={c.subtitle}
        actions={
          <Link href="/teacher/courses/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            {c.new}
          </Link>
        }
      />
      <Table head={[c.courseTitle, c.class, t.teacher.lessons.files, ""]} minWidth={640}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={4} text={c.empty} />
        ) : (
          rows.map((r) => {
            const subject = one(r.subject);
            const courseFiles = filesOf(r.id);
            return (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/teacher/courses/${r.id}`} className="link">
                    {r.title}
                  </Link>
                  {r.description && <p className="mt-1 line-clamp-2 max-w-md text-sm text-slate-500">{r.description}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">{one(subject?.class)?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {courseFiles.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <ul className="space-y-1.5">
                      {courseFiles.map((f) => (
                        <li key={f.id}>
                          <a
                            href={f.url ?? undefined}
                            className="group inline-flex max-w-xs items-center gap-2.5 text-sm"
                            title={f.name}
                          >
                            <FileIcon mime={f.mime_type} name={f.name} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-navy-900 group-hover:underline">{f.name}</span>
                              {f.size_bytes ? (
                                <span className="block text-xs text-slate-500">{formatSize(f.size_bytes)}</span>
                              ) : null}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.is_published ? "teal" : "slate"}>{r.is_published ? c.online : c.draft}</Badge>
                </td>
              </tr>
            );
          })
        )}
      </Table>
    </>
  );
}
