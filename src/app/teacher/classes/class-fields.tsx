import { Field, SelectField, TextareaField } from "@/components/ui/form";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Option = { value: string; label: string };

export function TeacherClassFields({
  t,
  none,
  levels,
  values,
}: {
  t: Dictionary["teacher"]["classes"];
  none: string;
  levels: Option[];
  values?: {
    name?: string;
    level?: string | null;
    academic_year?: string;
    description?: string | null;
    monthly_fee?: number | string | null;
  };
}) {
  const levelOptions =
    values?.level && !levels.some((l) => l.value === values.level)
      ? [...levels, { value: values.level, label: values.level }]
      : levels;
  return (
    <>
      <Field label={t.name} name="name" required defaultValue={values?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t.level}
          name="level"
          options={levelOptions}
          placeholder={none}
          defaultValue={values?.level}
        />
        <Field
          label={t.year}
          name="academic_year"
          required
          dir="ltr"
          placeholder="2026-2027"
          defaultValue={values?.academic_year}
        />
      </div>
      <Field
        label={t.monthlyFee}
        name="monthly_fee"
        type="number"
        dir="ltr"
        hint={t.monthlyFeeHint}
        defaultValue={
          values?.monthly_fee == null ? "" : String(values.monthly_fee)
        }
      />
      <TextareaField
        label={t.description}
        name="description"
        defaultValue={values?.description}
      />
    </>
  );
}
