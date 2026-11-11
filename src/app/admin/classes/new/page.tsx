import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { Form, SubmitButton } from "@/components/ui/form";
import { getAcademicYear, getLevelOptions, getSchoolOptions, getTeacherOptions } from "../../_data";
import { createClass } from "../actions";
import { ClassFields } from "../class-fields";

export const metadata = { title: "Nouvelle classe" };

export default async function NewClassPage() {
  const { t } = await getDictionary();
  const c = t.admin.classes;
  const [teachers, schools, levels, year] = await Promise.all([
    getTeacherOptions(),
    getSchoolOptions(),
    getLevelOptions(),
    getAcademicYear(),
  ]);

  return (
    <>
      <PageHeader title={c.new} back={{ href: "/admin/classes", label: c.title }} />
      <section className="card max-w-2xl p-5 sm:p-6">
        {teachers.length === 0 ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>{c.noTeacher}</p>
            <Link href="/admin/teachers/new" className="btn-primary">
              {t.admin.users.newTeacher}
            </Link>
          </div>
        ) : (
          <Form action={createClass}>
            <ClassFields
              t={c}
              none={t.common.none}
              teachers={teachers}
              schools={schools}
              levels={levels}
              values={{ academic_year: year }}
            />
            <div className="flex justify-end">
              <SubmitButton pendingLabel={t.common.saving}>{t.common.create}</SubmitButton>
            </div>
          </Form>
        )}
      </section>
    </>
  );
}
