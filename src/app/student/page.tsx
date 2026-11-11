import { BookOpen, CalendarClock, ListChecks, Award, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must, mustCount } from "@/lib/query";
import { StatCard, Panel, EmptyState } from "@/components/ui/stat-card";

export const metadata = { title: "Mon espace" };

export default async function StudentDashboard() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const head = { count: "exact" as const, head: true };
  const now = new Date().toISOString();

  // La RLS ne renvoie que les contenus publiés des classes où l'élève est inscrit.
  const [subjects, assignments, exams, grades, meetings] = await Promise.all([
    supabase.from("subjects").select("id", head),
    supabase
      .from("assignments")
      .select("id, title, due_at, subject:subjects(name, color)")
      .gte("due_at", now)
      .order("due_at")
      .limit(5),
    supabase.from("exams").select("id", head).or(`ends_at.is.null,ends_at.gte.${now}`),
    supabase
      .from("grades")
      .select("id, title, score, max_score, created_at, subject:subjects(name)")
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("meetings")
      .select("id, title, starts_at, duration_minutes, subject:subjects(name)")
      .in("status", ["scheduled", "live"])
      .gte("starts_at", new Date(Date.now() - 3 * 3600_000).toISOString())
      .order("starts_at")
      .limit(4),
  ]);

  const dueList = must(assignments) as unknown as {
    id: string;
    title: string;
    due_at: string;
    subject: { name: string; color: string } | null;
  }[];
  const gradeList = must(grades) as unknown as {
    id: string;
    title: string;
    score: number;
    max_score: number;
    created_at: string;
    subject: { name: string } | null;
  }[];
  const upcoming = must(meetings) as unknown as {
    id: string;
    title: string;
    starts_at: string;
    duration_minutes: number;
    subject: { name: string } | null;
  }[];

  // Moyenne ramenée sur 20
  const average =
    gradeList.length > 0
      ? (gradeList.reduce((s, g) => s + (Number(g.score) / Number(g.max_score)) * 20, 0) / gradeList.length).toFixed(2)
      : "—";

  const firstName = profile.full_name.split(" ")[0] || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
        {t.student.greeting}
        {firstName && `, ${firstName}`} ✨
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.student.stats.subjects} value={mustCount(subjects)} icon={BookOpen} tone="teal" />
        <StatCard label={t.student.stats.dueSoon} value={dueList.length} icon={CalendarClock} tone="amber" />
        <StatCard label={t.student.stats.exams} value={mustCount(exams)} icon={ListChecks} tone="violet" />
        <StatCard label={t.student.stats.average} value={average === "—" ? average : `${average}/20`} icon={Award} tone="navy" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t.student.upcomingAssignments} className="lg:col-span-2">
          {dueList.length === 0 ? (
            <EmptyState text={t.common.empty} />
          ) : (
            <ul className="space-y-2">
              {dueList.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: a.subject?.color ?? "#14A896" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.subject?.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {t.student.due} {formatDate(a.due_at, locale, true)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t.student.upcomingMeetings}>
          {upcoming.length === 0 ? (
            <EmptyState text={t.common.empty} />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl bg-teal-50/60 p-3">
                  <Video className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.subject?.name && `${m.subject.name} · `}
                      {formatDate(m.starts_at, locale, true)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={t.student.latestGrades}>
        {gradeList.length === 0 ? (
          <EmptyState text={t.common.empty} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {gradeList.slice(0, 6).map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">{g.title}</p>
                  <p className="text-xs text-slate-500">{g.subject?.name}</p>
                </div>
                <span className="font-semibold tabular-nums text-navy-900" dir="ltr">
                  {Number(g.score)}/{Number(g.max_score)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
