import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, UserMinus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { Flash, PageHeader } from "@/components/ui/page";
import { ConfirmForm, Form, SelectField, SubmitButton } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import { getLevelOptions, getSchoolOptions, getTeacherOptions, one } from "../../_data";
import { deleteClass, enrollStudent, unenrollStudent, updateClass } from "../actions";
import { ClassFields } from "../class-fields";

type Enrolled = {
  student_id: string;
  student: { student_code: string | null; profile: { full_name: string; email: string } | null } | null;
};

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { t } = await getDictionary();
  const c = t.admin.classes;

  const { data: klass } = await supabase
    .from("classes")
    .select("id, name, teacher_id, school_id, level, academic_year, description")
    .eq("id", id)
    .maybeSingle();
  if (!klass) notFound();

  const [teachers, schools, levels, enrolledRes, studentsRes] = await Promise.all([
    getTeacherOptions(),
    getSchoolOptions(),
    getLevelOptions(),
    supabase
      .from("enrollments")
      .select("student_id, student:students(student_code, profile:profiles(full_name, email))")
      .eq("class_id", id)
      .order("enrolled_at"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .eq("status", "active")
      .order("full_name")
      .limit(1000),
  ]);

  const enrolled = (enrolledRes.data ?? []) as unknown as Enrolled[];
  const enrolledIds = new Set(enrolled.map((e) => e.student_id));
  const available = (studentsRes.data ?? [])
    .filter((s) => !enrolledIds.has(s.id))
    .map((s) => ({ value: s.id as string, label: `${s.full_name || "—"} · ${s.email}` }));

  return (
    <>
      <PageHeader title={klass.name} subtitle={c.editTitle} back={{ href: "/admin/classes", label: c.title }} />
      <Flash message={ok === "created" ? c.createdOk : null} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <Form action={updateClass.bind(null, klass.id)}>
              <ClassFields t={c} none={t.common.none} teachers={teachers} schools={schools} levels={levels} values={klass} />
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

        <section className="card h-fit p-5">
          <h2 className="section-title mb-4">
            {c.enrollments} <span className="font-normal text-slate-500">({enrolled.length})</span>
          </h2>

          {available.length > 0 ? (
            <Form action={enrollStudent.bind(null, klass.id)} className="mb-5" resetOnSuccess>
              <SelectField label={c.addStudent} name="student_id" options={available} placeholder={c.chooseStudent} required />
              <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="w-full">
                <UserPlus className="h-4 w-4" aria-hidden />
                {c.addStudent}
              </SubmitButton>
            </Form>
          ) : (
            <p className="mb-5 text-xs text-slate-500">{c.noStudentsLeft}</p>
          )}

          {enrolled.length === 0 ? (
            <EmptyState text={t.common.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {enrolled.map((e) => {
                const student = one(e.student);
                const profile = one(student?.profile);
                return (
                  <li key={e.student_id} className="flex items-center gap-2 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/students/${e.student_id}`} className="link block truncate">
                        {profile?.full_name || profile?.email}
                      </Link>
                      {student?.student_code && (
                        <p className="text-xs text-slate-500" dir="ltr">
                          {student.student_code}
                        </p>
                      )}
                    </div>
                    <form action={unenrollStudent}>
                      <input type="hidden" name="class_id" value={klass.id} />
                      <input type="hidden" name="student_id" value={e.student_id} />
                      <button type="submit" className="btn-ghost-danger" aria-label={`${c.remove} ${profile?.full_name ?? ""}`}>
                        <UserMinus className="h-4 w-4" aria-hidden />
                        <span className="hidden sm:inline">{c.remove}</span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
