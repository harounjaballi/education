import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { ConfirmForm, Form, SubmitButton } from "@/components/ui/form";
import { StatCard } from "@/components/ui/stat-card";
import { Users, School } from "lucide-react";
import { deleteSchool, updateSchool } from "../actions";
import { SchoolFields } from "../school-fields";

export default async function SchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getDictionary();
  const s = t.admin.schools;

  const { data: school } = await supabase
    .from("schools")
    .select("id, name, city, address, phone, is_active, profiles(count), classes(count)")
    .eq("id", id)
    .maybeSingle();
  if (!school) notFound();

  const members = (school.profiles as unknown as { count: number }[])[0]?.count ?? 0;
  const classes = (school.classes as unknown as { count: number }[])[0]?.count ?? 0;

  return (
    <>
      <PageHeader title={school.name} subtitle={s.editTitle} back={{ href: "/admin/schools", label: s.title }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="card p-5 sm:p-6">
          <Form action={updateSchool.bind(null, school.id)}>
            <SchoolFields t={s} school={school} />
            <div className="flex justify-end">
              <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
            </div>
          </Form>
        </section>

        <div className="space-y-4">
          <StatCard label={s.members} value={members} icon={Users} tone="teal" />
          <StatCard label={s.classes} value={classes} icon={School} tone="navy" />
          <ConfirmForm action={deleteSchool} confirmMessage={s.deleteConfirm}>
            <input type="hidden" name="id" value={school.id} />
            <button type="submit" className="btn-ghost-danger w-full justify-center">
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.common.delete}
            </button>
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
