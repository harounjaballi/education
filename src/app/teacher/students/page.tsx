import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, EmptyRow, PageHeader, SearchForm, Table, sanitizeSearch } from "@/components/ui/page";
import { one } from "@/app/admin/_data";

export const metadata = { title: "Mes élèves" };

type ClassRef = { id: string; name: string };
type Row = {
  id: string;
  full_name: string;
  email: string;
  student: { student_code: string | null; level: string | null; enrollments: { class: ClassRef | ClassRef[] | null }[] } | null;
};

export default async function TeacherStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { t } = await getDictionary();
  const s = t.teacher.students;
  const u = t.admin.users;
  const q = sanitizeSearch(sp.q);

  // RLS : seuls les élèves inscrits dans une classe de cet enseignant, et seulement ses inscriptions.
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, student:students(student_code, level, enrollments(class:classes(id, name)))")
    .eq("role", "student")
    .order("full_name")
    .limit(500);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const rows = must(await query) as unknown as Row[];

  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <SearchForm defaultValue={q} placeholder={u.searchPlaceholder} label={t.common.search} />
      <Table head={[u.fullName, u.studentCode, u.level, s.classes]} minWidth={640}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={4} text={q ? t.common.noResults : s.empty} />
        ) : (
          rows.map((r) => {
            const student = one(r.student);
            const classes = (student?.enrollments ?? []).map((e) => one(e.class)).filter((c): c is ClassRef => !!c);
            return (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/teacher/students/${r.id}`} className="link">
                    {r.full_name || r.email}
                  </Link>
                  <p className="text-xs text-slate-500" dir="ltr">
                    {r.email}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600" dir="ltr">
                  {student?.student_code ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{student?.level ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {classes.map((c) => (
                      <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                        <Badge tone="navy">{c.name}</Badge>
                      </Link>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </Table>
    </>
  );
}
