import { Field, SelectField } from "@/components/ui/form";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ManagedRole } from "./actions";

type Option = { value: string; label: string };

export type UserFormValues = {
  full_name?: string;
  email?: string;
  school_id?: string | null;
  specialty?: string | null;
  phone?: string | null;
  student_code?: string | null;
  level?: string | null;
  birth_date?: string | null;
  guardian_phone?: string | null;
};

export function UserFields({
  role,
  t,
  none,
  schools,
  levels,
  user,
  withPassword,
}: {
  role: ManagedRole;
  t: Dictionary["admin"]["users"];
  none: string;
  schools: Option[];
  levels: Option[];
  user?: UserFormValues;
  withPassword?: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.fullName} name="full_name" required defaultValue={user?.full_name} autoComplete="off" />
        <Field label={t.email} name="email" type="email" required dir="ltr" defaultValue={user?.email} autoComplete="off" />
      </div>
      {withPassword && (
        <Field
          label={t.password}
          name="password"
          type="password"
          required
          dir="ltr"
          hint={t.passwordHint}
          autoComplete="new-password"
        />
      )}
      <SelectField label={t.school} name="school_id" options={schools} placeholder={none} defaultValue={user?.school_id} />

      {role === "teacher" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.specialty} name="specialty" defaultValue={user?.specialty} />
          <Field label={t.phone} name="phone" type="tel" dir="ltr" defaultValue={user?.phone} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.studentCode} name="student_code" dir="ltr" defaultValue={user?.student_code} />
            <SelectField
              label={t.level}
              name="level"
              options={
                user?.level && !levels.some((l) => l.value === user.level)
                  ? [...levels, { value: user.level, label: user.level }]
                  : levels
              }
              placeholder={none}
              defaultValue={user?.level}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.birthDate} name="birth_date" type="date" dir="ltr" defaultValue={user?.birth_date} />
            <Field label={t.guardianPhone} name="guardian_phone" type="tel" dir="ltr" defaultValue={user?.guardian_phone} />
          </div>
        </>
      )}
    </>
  );
}
