import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { CheckboxField, Field, Form, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { createCourse } from "../actions";

export const metadata = { title: "Nouveau cours" };

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t } = await getDictionary();
  const c = t.teacher.courses;

  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("teacher_id", profile.id).order("name"),
    supabase.from("subjects").select("name").eq("teacher_id", profile.id).order("name"),
  ]);
  const classOptions = (classes ?? []).map((k) => ({ value: k.id as string, label: k.name as string }));
  const subjectNames = [...new Set((subjects ?? []).map((s) => s.name as string))];

  return (
    <>
      <PageHeader title={c.new} back={{ href: "/teacher/courses", label: c.title }} />
      <section className="card max-w-2xl p-5 sm:p-6">
        {classOptions.length === 0 ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>{c.noClass}</p>
            <Link href="/teacher/classes/new" className="btn-primary">
              {t.teacher.classes.new}
            </Link>
          </div>
        ) : (
          <Form action={createCourse}>
            <Field label={c.courseTitle} name="title" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={c.class}
                name="class_id"
                options={classOptions}
                required
                placeholder="—"
                defaultValue={sp.class ?? (classOptions.length === 1 ? classOptions[0].value : undefined)}
              />
              <Field label={c.subject} name="subject" required hint={c.subjectHint} list="subject-names" />
            </div>
            <datalist id="subject-names">
              {subjectNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <TextareaField label={c.description} name="description" />
            <CheckboxField label={c.published} name="is_published" />
            <div className="flex justify-end">
              <SubmitButton pendingLabel={t.common.saving}>{t.common.create}</SubmitButton>
            </div>
          </Form>
        )}
      </section>
    </>
  );
}
