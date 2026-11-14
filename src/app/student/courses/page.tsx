import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/stat-card";
import { one } from "@/app/admin/_data";

export const metadata = { title: "Mes cours" };

type Row = {
  id: string;
  title: string;
  description: string | null;
  subject: { name: string; color: string; class: { name: string } | null } | null;
  teacher: { profile: { full_name: string } | null } | null;
};

export default async function StudentCoursesPage() {
  const supabase = await createClient();
  const { t } = await getDictionary();
  const c = t.student.courses;

  // RLS : uniquement les cours publiés des classes où l'élève est inscrit.
  const rows = must(
    await supabase
      .from("courses")
      .select("id, title, description, subject:subjects(name, color, class:classes(name)), teacher:teachers(profile:profiles(full_name))")
      .order("position")
      .order("created_at"),
  ) as unknown as Row[];

  return (
    <>
      <PageHeader title={c.title} subtitle={c.subtitle} />
      {rows.length === 0 ? (
        <section className="card p-6">
          <EmptyState text={c.empty} />
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const subject = one(r.subject);
            const teacher = one(one(r.teacher)?.profile);
            return (
              <Link key={r.id} href={`/student/courses/${r.id}`} className="card group flex flex-col gap-3 p-5 transition hover:shadow-lift">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-white"
                  style={{ backgroundColor: subject?.color ?? "#14B8A6" }}
                >
                  <BookOpen className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{subject?.name}</p>
                  <h2 className="font-semibold text-navy-900 group-hover:underline">{r.title}</h2>
                  {r.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.description}</p>}
                </div>
                <p className="mt-auto text-xs text-slate-500">
                  {[teacher?.full_name, one(subject?.class)?.name].filter(Boolean).join(" · ")}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
