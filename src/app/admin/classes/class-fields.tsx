import { Field, SelectField, TextareaField } from "@/components/ui/form";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Option = { value: string; label: string };
type ClassValues = {
  name?: string;
  teacher_id?: string;
  school_id?: string | null;
  level?: string | null;
  academic_year?: string;
  description?: string | null;
};

export function ClassFields({
  t,
  none,
  teachers,
  schools,
  levels,
  values,
}: {
  t: Dictionary["admin"]["classes"];
  none: string;
  teachers: Option[];
  schools: Option[];
  levels: Option[];
  values?: ClassValues;
}) {
  const levelOptions =
    values?.level && !levels.some((l) => l.value === values.level)
      ? [...levels, { value: values.level, label: values.level }]
      : levels;
  return (
    <>
      <Field label={t.name} name="name" required defaultValue={values?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t.teacher} name="teacher_id" required options={teachers} placeholder="—" defaultValue={values?.teacher_id} />
        <SelectField label={t.school} name="school_id" options={schools} placeholder={none} defaultValue={values?.school_id} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t.level} name="level" options={levelOptions} placeholder={none} defaultValue={values?.level} />
        <Field label={t.year} name="academic_year" required dir="ltr" placeholder="2026-2027" defaultValue={values?.academic_year} />
      </div>
      <TextareaField label={t.description} name="description" defaultValue={values?.description} />
    </>
  );
}
