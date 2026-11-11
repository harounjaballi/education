import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { EmptyRow, PageHeader, Pagination, SearchForm, Table, pageNumber, sanitizeSearch } from "@/components/ui/page";
import { countOf, one } from "../_data";

export const metadata = { title: "Classes" };
const PAGE_SIZE = 25;

type Row = {
  id: string;
  name: string;
  level: string | null;
  academic_year: string;
  school: { name: string } | null;
  teacher: { profile: { full_name: string; email: string } | null } | null;
  enrollments: unknown;
  subjects: unknown;
};

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { t } = await getDictionary();
  const c = t.admin.classes;
  const page = pageNumber(sp.page);
  const q = sanitizeSearch(sp.q);

  let query = supabase
    .from("classes")
    .select(
      "id, name, level, academic_year, school:schools(name), teacher:teachers(profile:profiles(full_name, email)), enrollments(count), subjects(count)",
      { count: "exact" },
    )
    .order("academic_year", { ascending: false })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,level.ilike.%${q}%`);

  const res = await query;
  const rows = must(res) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((res.count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={c.title}
        subtitle={c.subtitle}
        actions={
          <Link href="/admin/classes/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            {c.new}
          </Link>
        }
      />
      <SearchForm defaultValue={q} placeholder={`${c.name}, ${c.level.toLowerCase()}…`} label={t.common.search} />
      <Table head={[c.name, c.teacher, c.school, c.year, c.students, c.subjects]} minWidth={760}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={6} text={q ? t.common.noResults : t.common.empty} />
        ) : (
          rows.map((r) => {
            const profile = one(one(r.teacher)?.profile);
            return (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/classes/${r.id}`} className="link">
                    {r.name}
                  </Link>
                  {r.level && <p className="text-xs text-slate-500">{r.level}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">{profile?.full_name || profile?.email || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{one(r.school)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600" dir="ltr">
                  {r.academic_year}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(r.enrollments)}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{countOf(r.subjects)}</td>
              </tr>
            );
          })
        )}
      </Table>
      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => `/admin/classes?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`}
        labels={t.common}
      />
    </>
  );
}
