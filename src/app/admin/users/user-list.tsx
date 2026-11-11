import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import {
  Badge,
  EmptyRow,
  PageHeader,
  Pagination,
  SearchForm,
  STATUS_TONE,
  Table,
  pageNumber,
  sanitizeSearch,
} from "@/components/ui/page";
import type { AccountStatus } from "@/lib/types";
import { countOf, one } from "../_data";
import type { ManagedRole } from "./actions";

const PAGE_SIZE = 20;

type Row = {
  id: string;
  full_name: string;
  email: string;
  status: AccountStatus;
  created_at: string;
  school: { name: string } | null;
  teacher?: unknown;
  student?: unknown;
};

export async function UserList({
  role,
  searchParams,
}: {
  role: ManagedRole;
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const u = t.admin.users;
  const page = pageNumber(searchParams.page);
  const q = sanitizeSearch(searchParams.q);
  const status = ["active", "suspended", "disabled"].includes(searchParams.status ?? "")
    ? (searchParams.status as AccountStatus)
    : undefined;

  const extra =
    role === "teacher"
      ? "teacher:teachers(specialty, classes(count), courses(count))"
      : "student:students(student_code, level, enrollments(count))";

  let query = supabase
    .from("profiles")
    .select(`id, full_name, email, status, created_at, school:schools(name), ${extra}`, { count: "exact" })
    .eq("role", role)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (status) query = query.eq("status", status);

  const res = await query;
  const rows = must(res) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((res.count ?? 0) / PAGE_SIZE));

  const base = `/admin/${role}s`;
  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(p));
    return `${base}?${sp}`;
  };

  const head =
    role === "teacher"
      ? [u.fullName, u.school, u.specialty, u.classes, u.courses, u.status, u.createdAt]
      : [u.fullName, u.school, u.studentCode, u.level, u.classes, u.status, u.createdAt];

  return (
    <>
      <PageHeader
        title={role === "teacher" ? u.teachersTitle : u.studentsTitle}
        subtitle={role === "teacher" ? u.teachersSubtitle : u.studentsSubtitle}
        actions={
          <Link href={`${base}/new`} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            {role === "teacher" ? u.newTeacher : u.newStudent}
          </Link>
        }
      />

      <SearchForm
        defaultValue={q}
        placeholder={u.searchPlaceholder}
        label={t.common.search}
        extra={
          <select name="status" defaultValue={status ?? ""} className="input w-auto pe-9" aria-label={u.status}>
            <option value="">{`${u.status} : ${t.common.all}`}</option>
            <option value="active">{t.admin.status.active}</option>
            <option value="suspended">{t.admin.status.suspended}</option>
            <option value="disabled">{t.admin.status.disabled}</option>
          </select>
        }
      />

      <Table head={head} minWidth={820}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={head.length} text={q || status ? t.common.noResults : t.common.empty} />
        ) : (
          rows.map((r) => {
            const teacher = one(r.teacher as { specialty: string | null; classes: unknown; courses: unknown } | null);
            const student = one(
              r.student as { student_code: string | null; level: string | null; enrollments: unknown } | null,
            );
            return (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`${base}/${r.id}`} className="link">
                    {r.full_name || "—"}
                  </Link>
                  <p className="text-xs text-slate-500" dir="ltr">
                    {r.email}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">{one(r.school)?.name ?? "—"}</td>
                {role === "teacher" ? (
                  <>
                    <td className="px-4 py-3 text-slate-600">{teacher?.specialty ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(teacher?.classes)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(teacher?.courses)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">
                      {student?.student_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{student?.level ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(student?.enrollments)}</td>
                  </>
                )}
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[r.status]}>{t.admin.status[r.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(r.created_at, locale)}</td>
              </tr>
            );
          })
        )}
      </Table>

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} labels={t.common} />
    </>
  );
}
