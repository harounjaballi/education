import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { isOnline } from "@/lib/money";
import { AutoRefresh } from "@/components/messages/auto-refresh";
import { must } from "@/lib/query";
import {
  Badge,
  EmptyRow,
  PageHeader,
  SearchForm,
  Table,
  sanitizeSearch,
} from "@/components/ui/page";
import { one } from "@/app/admin/_data";

export const metadata = { title: "Mes élèves" };

type ClassRef = { id: string; name: string };
type Row = {
  id: string;
  full_name: string;
  email: string;
  last_seen_at: string | null;
  student: {
    student_code: string | null;
    level: string | null;
    enrollments: { class: ClassRef | ClassRef[] | null }[];
  } | null;
};

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; online?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const s = t.teacher.students;
  const u = t.admin.users;
  const q = sanitizeSearch(sp.q);

  // RLS : seuls les élèves inscrits dans une classe de cet enseignant, et seulement ses inscriptions.
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, last_seen_at, student:students(student_code, level, enrollments(class:classes(id, name)))",
    )
    .eq("role", "student")
    .order("full_name")
    .limit(500);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const all = must(await query) as unknown as Row[];
  const now = Date.now();
  const onlineCount = all.filter((r) => isOnline(r.last_seen_at, now)).length;
  const onlineOnly = sp.online === "1";
  // En ligne d'abord, puis ordre alphabétique.
  const rows = all
    .filter((r) => !onlineOnly || isOnline(r.last_seen_at, now))
    .sort(
      (a, b) =>
        Number(isOnline(b.last_seen_at, now)) -
        Number(isOnline(a.last_seen_at, now)),
    );

  return (
    <>
      <PageHeader
        title={s.title}
        subtitle={s.subtitle}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 ring-1 ring-teal-200">
            <span className="h-2 w-2 rounded-full bg-teal-500" aria-hidden />
            {onlineCount} {s.onlineNow}
          </span>
        }
      />
      <AutoRefresh ms={30_000} />
      <SearchForm
        defaultValue={q}
        placeholder={u.searchPlaceholder}
        label={t.common.search}
        extra={
          <label className="flex items-center gap-2 px-1 text-sm text-slate-600">
            <input
              type="checkbox"
              name="online"
              value="1"
              defaultChecked={onlineOnly}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            {s.onlineOnly}
          </label>
        }
      />
      <Table
        head={[u.fullName, s.presence, u.studentCode, u.level, s.classes]}
        minWidth={760}
      >
        {rows.length === 0 ? (
          <EmptyRow
            colSpan={5}
            text={q || onlineOnly ? t.common.noResults : s.empty}
          />
        ) : (
          rows.map((r) => {
            const student = one(r.student);
            const classes = (student?.enrollments ?? [])
              .map((e) => one(e.class))
              .filter((c): c is ClassRef => !!c);
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
                <td className="px-4 py-3">
                  {isOnline(r.last_seen_at, now) ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700">
                      <span
                        className="h-2 w-2 rounded-full bg-teal-500"
                        aria-hidden
                      />
                      {s.online}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {r.last_seen_at
                        ? formatDate(r.last_seen_at, locale, true)
                        : s.never}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600" dir="ltr">
                  {student?.student_code ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {student?.level ?? "—"}
                </td>
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
