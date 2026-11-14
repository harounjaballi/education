import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { Form, SubmitButton } from "@/components/ui/form";
import { getAcademicYear, getLevelOptions } from "@/app/admin/_data";
import { createClass } from "../../actions";
import { TeacherClassFields } from "../class-fields";

export const metadata = { title: "Nouvelle classe" };

export default async function NewTeacherClassPage() {
  const { t } = await getDictionary();
  const c = t.teacher.classes;
  const [levels, year] = await Promise.all([getLevelOptions(), getAcademicYear()]);

  return (
    <>
      <PageHeader title={c.new} back={{ href: "/teacher/classes", label: c.title }} />
      <section className="card max-w-2xl p-5 sm:p-6">
        <Form action={createClass}>
          <TeacherClassFields t={c} none={t.common.none} levels={levels} values={{ academic_year: year }} />
          <div className="flex justify-end">
            <SubmitButton pendingLabel={t.common.saving}>{t.common.create}</SubmitButton>
          </div>
        </Form>
      </section>
    </>
  );
}
