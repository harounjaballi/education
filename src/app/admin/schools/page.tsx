import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, EmptyRow, PageHeader, Table } from "@/components/ui/page";
import { Form, SubmitButton } from "@/components/ui/form";
import { createSchool } from "./actions";
import { SchoolFields } from "./school-fields";

export const metadata = { title: "Établissements" };

type Row = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  is_active: boolean;
  profiles: { count: number }[];
  classes: { count: number }[];
};

export default async function SchoolsPage() {
  const supabase = await createClient();
  const { t } = await getDictionary();
  const s = t.admin.schools;

  const rows = must(
    await supabase
      .from("schools")
      .select("id, name, city, phone, is_active, profiles(count), classes(count)")
      .order("name"),
  ) as unknown as Row[];

  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Table head={[s.name, s.city, s.members, s.classes, t.admin.users.status]} minWidth={560}>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} text={t.common.empty} />
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/schools/${r.id}`} className="link">
                    {r.name}
                  </Link>
                  {r.phone && (
                    <p className="text-xs text-slate-500" dir="ltr">
                      {r.phone}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.city ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{r.profiles[0]?.count ?? 0}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{r.classes[0]?.count ?? 0}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.is_active ? "teal" : "slate"}>{r.is_active ? s.active : s.inactive}</Badge>
                </td>
              </tr>
            ))
          )}
        </Table>

        <section className="card h-fit p-5">
          <h2 className="section-title mb-4">{s.new}</h2>
          <Form action={createSchool} resetOnSuccess>
            <SchoolFields t={s} />
            <SubmitButton pendingLabel={t.common.saving} className="w-full">
              {t.common.create}
            </SubmitButton>
          </Form>
        </section>
      </div>
    </>
  );
}
