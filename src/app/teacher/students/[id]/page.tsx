import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { Badge, PageHeader, STATUS_TONE } from "@/components/ui/page";
import { Field, Form, SubmitButton } from "@/components/ui/form";
import type { AccountStatus } from "@/lib/types";
import { one } from "@/app/admin/_data";
import { resetStudentPassword } from "../../actions";

type ClassRef = { id: string; name: string; academic_year: string };
type Student = {
  id: string;
  full_name: string;
  email: string;
  status: AccountStatus;
  student: {
    student_code: string | null;
    level: string | null;
    birth_date: string | null;
    guardian_phone: string | null;
    enrollments: { enrolled_at: string; class: ClassRef | ClassRef[] | null }[];
  } | null;
};

export default async function TeacherStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const s = t.teacher.students;
  const u = t.admin.users;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, status, student:students(student_code, level, birth_date, guardian_phone, enrollments(enrolled_at, class:classes(id, name, academic_year)))",
    )
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle();
  if (!data) notFound();

  const user = data as unknown as Student;
  const student = one(user.student);
  const enrollments = (student?.enrollments ?? [])
    .map((e) => ({ at: e.enrolled_at, klass: one(e.class) }))
    .filter((e): e is { at: string; klass: ClassRef } => !!e.klass);

  const info: [string, string | null | undefined, boolean?][] = [
    [u.email, user.email, true],
    [u.studentCode, student?.student_code, true],
    [u.level, student?.level],
    [u.birthDate, student?.birth_date ? formatDate(student.birth_date, locale) : null],
    [u.guardianPhone, student?.guardian_phone, true],
  ];

  return (
    <>
      <PageHeader
        title={user.full_name || user.email}
        subtitle={t.roles.student}
        back={{ href: "/teacher/students", label: s.title }}
        actions={
          <>
            <Badge tone={STATUS_TONE[user.status]}>{t.admin.status[user.status]}</Badge>
            <Link href={`/teacher/messages?with=${user.id}`} className="btn-secondary">
              <MessageSquare className="h-4 w-4" aria-hidden />
              {t.messages.send}
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{u.profileSection}</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {info.map(([label, value, ltr]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-navy-900" dir={ltr ? "ltr" : undefined}>
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{s.classes}</h2>
            <ul className="divide-y divide-slate-100">
              {enrollments.map((e) => (
                <li key={e.klass.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/teacher/classes/${e.klass.id}`} className="link">
                    {e.klass.name}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {s.enrolledOn} {formatDate(e.at, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card h-fit p-5">
          <h2 className="section-title mb-1">{s.passwordSection}</h2>
          <p className="mb-4 text-xs text-slate-500">{s.passwordHelp}</p>
          <Form action={resetStudentPassword.bind(null, user.id)} resetOnSuccess>
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
      </div>
    </>
  );
}
