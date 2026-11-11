import { Building2, Users, GraduationCap, School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must, mustCount } from "@/lib/query";
import { StatCard, Panel, EmptyState } from "@/components/ui/stat-card";
import { StatusDonut } from "@/components/charts/status-donut";
import type { AccountStatus, Role } from "@/lib/types";

export const metadata = { title: "Administration" };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { t, locale } = await getDictionary();

  const head = { count: "exact" as const, head: true };
  const [schools, teachers, students, classes, statusRows, recent, logs] = await Promise.all([
    supabase.from("schools").select("id", head),
    supabase.from("profiles").select("id", head).eq("role", "teacher"),
    supabase.from("profiles").select("id", head).eq("role", "student"),
    supabase.from("classes").select("id", head),
    supabase.from("profiles").select("status").neq("role", "super_admin"),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("audit_logs")
      .select("id, action, entity, created_at, actor:profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const statuses = must(statusRows) as { status: AccountStatus }[];
  const countBy = (s: AccountStatus) => statuses.filter((r) => r.status === s).length;
  const donut = [
    { key: "active", label: t.admin.status.active, value: countBy("active"), color: "#14A896" },
    { key: "suspended", label: t.admin.status.suspended, value: countBy("suspended"), color: "#F59E0B" },
    { key: "disabled", label: t.admin.status.disabled, value: countBy("disabled"), color: "#94A3B8" },
  ];

  const recentProfiles = must(recent) as {
    id: string;
    full_name: string;
    email: string;
    role: Role;
    status: AccountStatus;
    created_at: string;
  }[];
  const auditRows = must(logs) as unknown as {
    id: number;
    action: string;
    entity: string;
    created_at: string;
    actor: { full_name: string; email: string } | null;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{t.admin.title}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.admin.stats.schools} value={mustCount(schools)} icon={Building2} tone="navy" />
        <StatCard label={t.admin.stats.teachers} value={mustCount(teachers)} icon={Users} tone="teal" />
        <StatCard label={t.admin.stats.students} value={mustCount(students)} icon={GraduationCap} tone="violet" />
        <StatCard label={t.admin.stats.classes} value={mustCount(classes)} icon={School} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title={t.admin.accountStatus} className="lg:col-span-2">
          <StatusDonut data={donut} />
        </Panel>

        <Panel title={t.admin.recentAccounts} className="lg:col-span-3">
          {recentProfiles.length === 0 ? (
            <EmptyState text={t.common.empty} />
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <tbody className="divide-y divide-slate-100">
                  {recentProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-navy-900">{p.full_name || "—"}</p>
                        <p className="text-xs text-slate-500" dir="ltr">
                          {p.email}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{t.roles[p.role]}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} label={t.admin.status[p.status]} />
                      </td>
                      <td className="px-5 py-3 text-end text-xs text-slate-500">{formatDate(p.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title={t.admin.recentActivity}>
        {auditRows.length === 0 ? (
          <EmptyState text={t.common.empty} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {auditRows.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-navy-800">{log.action}</code>
                <span className="text-slate-600">{log.actor?.full_name || log.actor?.email || "—"}</span>
                <span className="ms-auto text-xs text-slate-500">{formatDate(log.created_at, locale, true)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function StatusBadge({ status, label }: { status: AccountStatus; label: string }) {
  const tone = {
    active: "bg-teal-50 text-teal-700 ring-teal-200",
    suspended: "bg-amber-50 text-amber-700 ring-amber-200",
    disabled: "bg-slate-100 text-slate-600 ring-slate-200",
  }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}>{label}</span>;
}
