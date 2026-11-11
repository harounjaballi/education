import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { Badge, Flash, PageHeader, STATUS_TONE } from "@/components/ui/page";
import { ConfirmForm, Field, Form, SelectField, SubmitButton } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import type { AccountStatus } from "@/lib/types";
import { countOf, getLevelOptions, getSchoolOptions, one } from "../_data";
import { deleteUser, resetPassword, setUserStatus, updateUser, type ManagedRole } from "./actions";
import { UserFields } from "./user-fields";

export async function UserDetail({ role, id, ok }: { role: ManagedRole; id: string; ok?: string }) {
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const u = t.admin.users;
  const me = await getCurrentProfile();

  const extra =
    role === "teacher"
      ? "teacher:teachers(specialty, phone)"
      : "student:students(student_code, level, birth_date, guardian_phone)";

  const { data: user } = await supabase
    .from("profiles")
    .select(`id, full_name, email, status, school_id, created_at, role, ${extra}`)
    .eq("id", id)
    .eq("role", role)
    .maybeSingle();
  if (!user) notFound();

  type Details = Record<string, string | null>;
  const details: Details = one((user as unknown as Record<string, Details | Details[] | null>)[role]) ?? {};

  const [schools, levels, linked, logs] = await Promise.all([
    getSchoolOptions(),
    getLevelOptions(),
    role === "teacher"
      ? supabase
          .from("classes")
          .select("id, name, level, academic_year, enrollments(count)")
          .eq("teacher_id", id)
          .order("name")
      : supabase
          .from("enrollments")
          .select("class:classes(id, name, level, academic_year)")
          .eq("student_id", id),
    supabase
      .from("audit_logs")
      .select("id, action, created_at")
      .eq("actor_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  type ClassRow = { id: string; name: string; level: string | null; academic_year: string; enrollments?: unknown };
  const classes: ClassRow[] =
    role === "teacher"
      ? ((linked.data ?? []) as unknown as ClassRow[])
      : ((linked.data ?? []) as unknown as { class: ClassRow | ClassRow[] | null }[])
          .map((e) => one(e.class))
          .filter((c): c is ClassRow => !!c);

  const isSelf = me?.id === user.id;
  const status = user.status as AccountStatus;

  return (
    <>
      <PageHeader
        title={user.full_name || user.email}
        subtitle={`${t.roles[role]} · ${u.createdAt} ${formatDate(user.created_at, locale)}`}
        back={{ href: `/admin/${role}s`, label: role === "teacher" ? u.teachersTitle : u.studentsTitle }}
        actions={<Badge tone={STATUS_TONE[status]}>{t.admin.status[status]}</Badge>}
      />
      <Flash message={ok === "created" ? u.createdOk : null} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{u.profileSection}</h2>
            <Form action={updateUser.bind(null, user.id, role)}>
              <UserFields
                role={role}
                t={u}
                none={t.common.none}
                schools={schools}
                levels={levels}
                user={{ full_name: user.full_name, email: user.email, school_id: user.school_id, ...details }}
              />
              <div className="flex justify-end">
                <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
              </div>
            </Form>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{role === "teacher" ? u.classes : u.enrolledIn}</h2>
            {classes.length === 0 ? (
              <EmptyState text={t.common.empty} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Link href={`/admin/classes/${c.id}`} className="link flex-1">
                      {c.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {[c.level, c.academic_year].filter(Boolean).join(" · ")}
                    </span>
                    {role === "teacher" && (
                      <Badge tone="navy">
                        {countOf(c.enrollments)} {t.admin.classes.students.toLowerCase()}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {!isSelf && (
            <section className="card p-5">
              <h2 className="section-title mb-1">{u.statusSection}</h2>
              <p className="mb-4 text-xs text-slate-500">{u.statusHelp}</p>
              <Form action={setUserStatus.bind(null, user.id, role)}>
                <SelectField
                  label={u.status}
                  name="status"
                  defaultValue={status}
                  options={(["active", "suspended", "disabled"] as const).map((s) => ({
                    value: s,
                    label: t.admin.status[s],
                  }))}
                />
                <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="w-full">
                  {u.applyStatus}
                </SubmitButton>
              </Form>
            </section>
          )}

          <section className="card p-5">
            <h2 className="section-title mb-4">{u.passwordSection}</h2>
            <Form action={resetPassword.bind(null, user.id, role)} resetOnSuccess>
              <Field
                label={u.newPassword}
                name="password"
                type="password"
                required
                dir="ltr"
                hint={u.passwordHint}
                autoComplete="new-password"
              />
              <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="w-full">
                {t.common.save}
              </SubmitButton>
            </Form>
          </section>

          <section className="card p-5">
            <h2 className="section-title mb-4">{u.activity}</h2>
            {(logs.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">{t.common.empty}</p>
            ) : (
              <ul className="space-y-2">
                {(logs.data ?? []).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-navy-800">{l.action}</code>
                    <span className="text-slate-500">{formatDate(l.created_at, locale, true)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!isSelf && (
            <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
              <h2 className="text-sm font-semibold text-red-700">{u.dangerZone}</h2>
              <p className="mb-4 mt-1 text-xs text-red-700/80">{u.deleteHelp}</p>
              <ConfirmForm action={deleteUser} confirmMessage={u.deleteConfirm}>
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="role" value={role} />
                <button type="submit" className="btn-danger w-full">
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {u.deleteAccount}
                </button>
              </ConfirmForm>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
