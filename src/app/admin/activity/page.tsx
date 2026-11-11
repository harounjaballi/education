import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, EmptyRow, PageHeader, Pagination, Table, pageNumber } from "@/components/ui/page";
import type { Role } from "@/lib/types";
import { one } from "../_data";

export const metadata = { title: "Journal d'activité" };
const PAGE_SIZE = 40;

type Row = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: { id: string; full_name: string; email: string; role: Role } | null;
};

const ROLE_TONE = { super_admin: "navy", teacher: "teal", student: "violet" } as const;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; actor?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const a = t.admin.activity;
  const page = pageNumber(sp.page);
  const role = (["super_admin", "teacher", "student"] as const).find((r) => r === sp.role);
  const actor = /^[0-9a-f-]{36}$/i.test(sp.actor ?? "") ? sp.actor : undefined;

  // `!inner` permet de filtrer les entrées selon le rôle de l'auteur.
  let query = supabase
    .from("audit_logs")
    .select(
      `id, action, entity, entity_id, metadata, created_at, actor:profiles${role ? "!inner" : ""}(id, full_name, email, role)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (role) query = query.eq("actor.role", role);
  if (actor) query = query.eq("actor_id", actor);

  const res = await query;
  const rows = must(res) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((res.count ?? 0) / PAGE_SIZE));

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (actor) params.set("actor", actor);
    params.set("page", String(p));
    return `/admin/activity?${params}`;
  };

  const profileHref = (r: NonNullable<Row["actor"]>) =>
    r.role === "teacher" ? `/admin/teachers/${r.id}` : r.role === "student" ? `/admin/students/${r.id}` : null;

  return (
    <>
      <PageHeader title={a.title} subtitle={a.subtitle} />

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {actor && <input type="hidden" name="actor" value={actor} />}
        <select name="role" defaultValue={role ?? ""} className="input w-auto pe-9" aria-label={a.actor}>
          <option value="">{a.allActors}</option>
          <option value="super_admin">{t.roles.super_admin}</option>
          <option value="teacher">{t.roles.teacher}</option>
          <option value="student">{t.roles.student}</option>
        </select>
        <button type="submit" className="btn-secondary">
          {a.filter}
        </button>
        {(role || actor) && (
          <Link href="/admin/activity" className="btn-secondary">
            {t.common.all}
          </Link>
        )}
      </form>

      <Table head={[a.date, a.actor, a.action, a.entity]} minWidth={680}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={4} text={t.common.empty} />
        ) : (
          rows.map((r) => {
            const who = one(r.actor);
            const link = who ? profileHref(who) : null;
            return (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(r.created_at, locale, true)}</td>
                <td className="px-4 py-3">
                  {who ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {link ? (
                        <Link href={link} className="link">
                          {who.full_name || who.email}
                        </Link>
                      ) : (
                        <span className="font-medium text-navy-900">{who.full_name || who.email}</span>
                      )}
                      <Badge tone={ROLE_TONE[who.role]}>{t.roles[who.role]}</Badge>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-navy-800">{r.action}</code>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {r.entity}
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <span className="ms-1 text-slate-400" dir="ltr">
                      {Object.entries(r.metadata)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </Table>
      <Pagination page={page} totalPages={totalPages} buildHref={href} labels={t.common} />
    </>
  );
}
