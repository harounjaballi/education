import { Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/stat-card";
import { LocalTime } from "@/components/local-time";
import { canJoin, isPast, type MeetingStatus } from "@/lib/meetings";
import { one } from "@/app/admin/_data";

export const metadata = { title: "Visioconférences" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  status: MeetingStatus;
  class: { name: string } | null;
  teacher: { profile: { full_name: string } | null } | null;
};

export default async function StudentMeetingsPage() {
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const m = t.student.meetings;
  const tm = t.teacher.meetings;

  // RLS : uniquement les séances des classes où l'élève est inscrit.
  const rows = must(
    await supabase
      .from("meetings")
      .select("id, title, description, starts_at, duration_minutes, status, class:classes(name), teacher:teachers(profile:profiles(full_name))")
      .neq("status", "cancelled")
      .gte("starts_at", new Date(Date.now() - 30 * 24 * 3600_000).toISOString())
      .order("starts_at")
      .limit(200),
  ) as unknown as Row[];
  const now = Date.now();
  const upcoming = rows.filter((x) => !isPast(x, now));
  const past = rows.filter((x) => isPast(x, now)).reverse();

  const item = (x: Row, isUpcoming: boolean) => {
    const teacher = one(one(x.teacher)?.profile)?.full_name;
    return (
      <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Video className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-navy-900">{x.title}</p>
            {isUpcoming && x.status === "live" && <Badge tone="teal">{tm.statusLive}</Badge>}
          </div>
          <p className="text-xs text-slate-500">
            <LocalTime value={x.starts_at} locale={locale} /> · {x.duration_minutes} {tm.minutes}
            {[teacher, one(x.class)?.name].filter(Boolean).map((s) => ` · ${s}`).join("")}
          </p>
          {x.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{x.description}</p>}
        </div>
        {isUpcoming &&
          (canJoin(x, now) ? (
            <a href={`/student/meetings/${x.id}/join`} target="_blank" rel="noopener" className="btn-primary shrink-0">
              <Video className="h-4 w-4" aria-hidden />
              {m.join}
            </a>
          ) : (
            <span className="shrink-0 text-xs text-slate-500">{m.notYet}</span>
          ))}
      </li>
    );
  };

  return (
    <>
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="section-title mb-2">{m.upcoming}</h2>
          {upcoming.length === 0 ? (
            <EmptyState text={m.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">{upcoming.map((x) => item(x, true))}</ul>
          )}
        </section>
        {past.length > 0 && (
          <section className="card p-5">
            <h2 className="section-title mb-2">{m.past}</h2>
            <ul className="divide-y divide-slate-100">{past.map((x) => item(x, false))}</ul>
          </section>
        )}
      </div>
    </>
  );
}
