import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, UserMinus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { Flash, PageHeader } from "@/components/ui/page";
import { ConfirmForm, Field, Form, SelectField, SubmitButton } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import { getLevelOptions, one } from "@/app/admin/_data";
import {
  createStudentInClass,
  deleteClass,
  enrollByEmail,
  enrollMyStudent,
  unenrollStudent,
  updateClass,
} from "../../actions";
import { TeacherClassFields } from "../class-fields";

type Enrolled = {
  student_id: string;
  student: { student_code: string | null; profile: { full_name: string; email: string } | null } | null;
};

export default async function TeacherClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const c = t.teacher.classes;
  const u = t.admin.users;

  const { data: klass } = await supabase
    .from("classes")
    .select("id, name, level, academic_year, description, monthly_fee")
    .eq("id", id)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!klass) notFound();

  const [levels, enrolledRes, myStudentsRes] = await Promise.all([
    getLevelOptions(),
    supabase
      .from("enrollments")
      .select("student_id, student:students(student_code, profile:profiles(full_name, email))")
      .eq("class_id", id)
      .order("enrolled_at"),
    // La RLS ne renvoie que les élèves inscrits dans une classe de cet enseignant.
    supabase.from("profiles").select("id, full_name, email").eq("role", "student").order("full_name").limit(1000),
  ]);

  const enrolled = (enrolledRes.data ?? []) as unknown as Enrolled[];
  const enrolledIds = new Set(enrolled.map((e) => e.student_id));
  const others = (myStudentsRes.data ?? [])
    .filter((s) => !enrolledIds.has(s.id as string))
    .map((s) => ({ value: s.id as string, label: `${(s.full_name as string) || "—"} · ${s.email}` }));

  return (
    <>
      <PageHeader title={klass.name} subtitle={c.editTitle} back={{ href: "/teacher/classes", label: c.title }} />
      <Flash message={ok === "created" ? c.createdOk : null} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-1">{c.newStudent}</h2>
            <p className="mb-4 text-sm text-slate-500">{c.newStudentHelp}</p>
            <Form action={createStudentInClass.bind(null, klass.id)} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={u.fullName} name="full_name" required autoComplete="off" />
                <Field label={u.email} name="email" type="email" required dir="ltr" autoComplete="off" />
              </div>
              <Field
                label={u.password}
                name="password"
                type="password"
                required
                dir="ltr"
                hint={u.passwordHint}
                autoComplete="new-password"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={u.studentCode} name="student_code" dir="ltr" />
                <SelectField
                  label={u.level}
                  name="level"
                  options={levels}
                  placeholder={t.common.none}
                  defaultValue={klass.level}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={u.birthDate} name="birth_date" type="date" dir="ltr" />
                <Field label={u.guardianPhone} name="guardian_phone" type="tel" dir="ltr" />
              </div>
              <div className="flex justify-end">
                <SubmitButton pendingLabel={t.common.saving}>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  {c.newStudent}
                </SubmitButton>
              </div>
            </Form>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{c.editTitle}</h2>
            <Form action={updateClass.bind(null, klass.id)}>
              <TeacherClassFields t={c} none={t.common.none} levels={levels} values={klass} />
              <div className="flex justify-end">
                <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
              </div>
            </Form>
          </section>

          <ConfirmForm action={deleteClass} confirmMessage={c.deleteConfirm}>
            <input type="hidden" name="id" value={klass.id} />
            <button type="submit" className="btn-ghost-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.common.delete}
            </button>
          </ConfirmForm>
        </div>

        <div className="space-y-6">
          <section className="card h-fit p-5">
            <h2 className="section-title mb-4">
              {c.enrolled} <span className="font-normal text-slate-500">({enrolled.length})</span>
            </h2>
            {enrolled.length === 0 ? (
              <EmptyState text={t.common.empty} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {enrolled.map((e) => {
                  const student = one(e.student);
                  const p = one(student?.profile);
                  return (
                    <li key={e.student_id} className="flex items-center gap-2 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <Link href={`/teacher/students/${e.student_id}`} className="link block truncate">
                          {p?.full_name || p?.email}
                        </Link>
                        <p className="truncate text-xs text-slate-500" dir="ltr">
                          {student?.student_code ? `${student.student_code} · ` : ""}
                          {p?.email}
                        </p>
                      </div>
                      <ConfirmForm action={unenrollStudent} confirmMessage={c.removeConfirm}>
                        <input type="hidden" name="class_id" value={klass.id} />
                        <input type="hidden" name="student_id" value={e.student_id} />
                        <button type="submit" className="btn-ghost-danger" aria-label={`${c.remove} ${p?.full_name ?? ""}`}>
                          <UserMinus className="h-4 w-4" aria-hidden />
                          <span className="hidden sm:inline">{c.remove}</span>
                        </button>
                      </ConfirmForm>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card h-fit space-y-5 p-5">
            <div>
              <h2 className="section-title mb-1">{c.existingStudent}</h2>
              <p className="mb-3 text-xs text-slate-500">{c.existingStudentHelp}</p>
              <Form action={enrollByEmail.bind(null, klass.id)} resetOnSuccess>
                <Field label={u.email} name="email" type="email" required dir="ltr" autoComplete="off" />
                <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="w-full">
                  {c.add}
                </SubmitButton>
              </Form>
            </div>

            {others.length > 0 && (
              <Form action={enrollMyStudent.bind(null, klass.id)} resetOnSuccess>
                <SelectField
                  label={c.fromMyStudents}
                  name="student_id"
                  options={others}
                  placeholder={c.chooseStudent}
                  required
                />
                <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="w-full">
                  {c.add}
                </SubmitButton>
              </Form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
