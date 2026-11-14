import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, EmptyRow, PageHeader, Table } from "@/components/ui/page";
import { countOf, one } from "@/app/admin/_data";

export const metadata = { title: "Mes cours" };

type Row = {
  id: string;
  title: string;
  is_published: boolean;
  subject: { name: string; class: { name: string } | null } | null;
  chapters: unknown;
};

export default async function TeacherCoursesPage() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const c = t.teacher.courses;

  const rows = must(
    await supabase
      .from("courses")
      .select("id, title, is_published, subject:subjects(name, class:classes(name)), chapters(count)")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false }),
  ) as unknown as Row[];

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
      <Table head={[c.courseTitle, c.class, c.subject, c.chapters, ""]} minWidth={640}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} text={c.empty} />
        ) : (
          rows.map((r) => {
            const subject = one(r.subject);
            return (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/teacher/courses/${r.id}`} className="link">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{one(subject?.class)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{subject?.name ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(r.chapters)}</td>
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
