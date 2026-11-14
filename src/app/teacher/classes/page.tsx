import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { EmptyRow, PageHeader, Table } from "@/components/ui/page";
import { countOf } from "@/app/admin/_data";

export const metadata = { title: "Mes classes" };

type Row = { id: string; name: string; level: string | null; academic_year: string; enrollments: unknown };

export default async function TeacherClassesPage() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const c = t.teacher.classes;

  const rows = must(
    await supabase
      .from("classes")
      .select("id, name, level, academic_year, enrollments(count)")
      .eq("teacher_id", profile.id)
      .order("academic_year", { ascending: false })
      .order("name"),
  ) as unknown as Row[];

  return (
    <>
      <PageHeader
        title={c.title}
        subtitle={c.subtitle}
        actions={
          <Link href="/teacher/classes/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            {c.new}
          </Link>
        }
      />
      <Table head={[c.name, c.level, c.year, c.students]} minWidth={560}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={4} text={c.empty} />
        ) : (
          rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/teacher/classes/${r.id}`} className="link">
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.level ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600" dir="ltr">
                {r.academic_year}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(r.enrollments)}</td>
            </tr>
          ))
        )}
      </Table>
    </>
  );
}
