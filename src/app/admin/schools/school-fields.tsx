import { CheckboxField, Field } from "@/components/ui/form";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type School = { name: string; city: string | null; address: string | null; phone: string | null; is_active: boolean };

export function SchoolFields({ t, school }: { t: Dictionary["admin"]["schools"]; school?: School }) {
  return (
    <>
      <Field label={t.name} name="name" required defaultValue={school?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.city} name="city" defaultValue={school?.city} />
        <Field label={t.phone} name="phone" type="tel" dir="ltr" defaultValue={school?.phone} />
      </div>
      <Field label={t.address} name="address" defaultValue={school?.address} />
      <CheckboxField label={t.isActive} name="is_active" defaultChecked={school?.is_active ?? true} />
    </>
  );
}
