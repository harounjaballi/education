import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { PageHeader } from "@/components/ui/page";
import { ConfirmForm, Field, Form, SelectField, SubmitButton } from "@/components/ui/form";
import { addLevel, deleteLevel, updateSettings } from "./actions";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { t } = await getDictionary();
  const s = t.admin.settings;

  const [settingsRes, levelsRes] = await Promise.all([
    supabase.from("platform_settings").select("platform_name, academic_year, support_email, default_locale, currency").single(),
    supabase.from("levels").select("id, name").order("position").order("name"),
  ]);
  const settings = must(settingsRes) as {
    platform_name: string;
    academic_year: string;
    support_email: string | null;
    default_locale: "fr" | "ar";
    currency: string;
  };
  const levels = must(levelsRes) as { id: string; name: string }[];

  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card h-fit p-5 sm:p-6">
          <h2 className="section-title mb-4">{s.general}</h2>
          <Form action={updateSettings}>
            <Field label={s.platformName} name="platform_name" required defaultValue={settings.platform_name} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={s.academicYear} name="academic_year" required dir="ltr" defaultValue={settings.academic_year} />
              <SelectField
                label={s.defaultLocale}
                name="default_locale"
                defaultValue={settings.default_locale}
                options={[
                  { value: "fr", label: "Français" },
                  { value: "ar", label: "العربية" },
                ]}
              />
            </div>
            <Field label={s.supportEmail} name="support_email" type="email" dir="ltr" defaultValue={settings.support_email} />
            <Field label={s.currency} name="currency" required hint={s.currencyHint} defaultValue={settings.currency} />
            <div className="flex justify-end">
              <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
            </div>
          </Form>
        </section>

        <section className="card h-fit p-5 sm:p-6">
          <h2 className="section-title mb-1">{s.levels}</h2>
          <p className="mb-4 text-xs text-slate-500">{s.levelsHelp}</p>

          <ul className="mb-5 flex flex-wrap gap-2">
            {levels.map((l) => (
              <li key={l.id} className="inline-flex items-center gap-1 rounded-full bg-navy-50 py-1 pe-1 ps-3 text-sm text-navy-800">
                {l.name}
                <ConfirmForm action={deleteLevel} confirmMessage={s.deleteLevelConfirm}>
                  <input type="hidden" name="id" value={l.id} />
                  <button
                    type="submit"
                    className="grid h-6 w-6 place-items-center rounded-full text-navy-500 transition hover:bg-red-100 hover:text-red-600"
                    aria-label={`${t.common.delete} ${l.name}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </ConfirmForm>
              </li>
            ))}
            {levels.length === 0 && <li className="text-sm text-slate-500">{t.common.empty}</li>}
          </ul>

          <Form action={addLevel} resetOnSuccess>
            <div className="sm:flex sm:items-end sm:gap-2">
              <Field label={s.levelName} name="name" required className="flex-1" />
              <SubmitButton variant="secondary" pendingLabel={t.common.saving} className="mt-3 w-full sm:mt-0 sm:w-auto">
                {s.addLevel}
              </SubmitButton>
            </div>
          </Form>
        </section>
      </div>
    </>
  );
}
