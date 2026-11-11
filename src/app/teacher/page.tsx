import { School, Users, BookOpen, ClipboardCheck, Video, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must, mustCount } from "@/lib/query";
import { StatCard, Panel, EmptyState } from "@/components/ui/stat-card";

export const metadata = { title: "Espace enseignant" };

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const head = { count: "exact" as const, head: true };

  // La RLS limite automatiquement chaque requête aux données de cet enseignant.
  const [classes, enrollments, courses, toGrade, meetings, submissions] = await Promise.all([
    supabase.from("classes").select("id", head).eq("teacher_id", profile.id),
    supabase.from("enrollments").select("id", head),
    supabase.from("courses").select("id", head).eq("teacher_id", profile.id),
    supabase.from("submissions").select("id", head).eq("status", "submitted"),
    supabase
      .from("meetings")
      .select("id, title, starts_at, duration_minutes, class:classes(name)")
      .eq("teacher_id", profile.id)
      .in("status", ["scheduled", "live"])
      .gte("starts_at", new Date(Date.now() - 3 * 3600_000).toISOString())
      .order("starts_at")
      .limit(5),
    supabase
      .from("submissions")
      .select("id, submitted_at, status, assignment:assignments(title), student:students(profile:profiles(full_name))")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(5),
  ]);

  const upcoming = must(meetings) as unknown as {
    id: string;
    title: string;
    starts_at: string;
    duration_minutes: number;
    class: { name: string } | null;
  }[];
  const latest = must(submissions) as unknown as {
    id: string;
    submitted_at: string | null;
    assignment: { title: string } | null;
    student: { profile: { full_name: string } | null } | null;
  }[];

  const firstName = profile.full_name.split(" ")[0] || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
        {t.teacher.greeting}
        {firstName && `, ${firstName}`} 👋
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.teacher.stats.classes} value={mustCount(classes)} icon={School} tone="navy" />
        <StatCard label={t.teacher.stats.enrollments} value={mustCount(enrollments)} icon={Users} tone="teal" />
        <StatCard label={t.teacher.stats.courses} value={mustCount(courses)} icon={BookOpen} tone="violet" />
        <StatCard label={t.teacher.stats.toGrade} value={mustCount(toGrade)} icon={ClipboardCheck} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t.teacher.upcomingMeetings}>
          {upcoming.length === 0 ? (
            <EmptyState text={t.common.empty} />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <Video className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.class?.name} · {formatDate(m.starts_at, locale, true)} · {m.duration_minutes} min
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t.teacher.latestSubmissions}>
          {latest.length === 0 ? (
            <EmptyState text={t.common.empty} />
          ) : (
            <ul className="space-y-2">
              {latest.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <FileText className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{s.assignment?.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.student?.profile?.full_name || "—"}
                      {s.submitted_at && ` · ${formatDate(s.submitted_at, locale, true)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
