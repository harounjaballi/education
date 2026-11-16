import Link from "next/link";
import { Square, Trash2, Users, Video, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, PageHeader } from "@/components/ui/page";
import { ConfirmForm, Field, Form, SelectField, SubmitButton, TextareaField } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import { LocalTime, LocalToIso } from "@/components/local-time";
import { canJoin, isPast, type MeetingStatus } from "@/lib/meetings";
import { countOf, one } from "@/app/admin/_data";
import { cancelMeeting, createMeeting, deleteMeeting, endMeeting } from "./actions";

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
  participants: unknown;
};

const DURATIONS = [30, 45, 60, 90, 120, 180];

export default async function TeacherMeetingsPage() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const m = t.teacher.meetings;

  const [classesRes, meetingsRes] = await Promise.all([
    supabase.from("classes").select("id, name").eq("teacher_id", profile.id).order("name"),
    supabase
      .from("meetings")
      .select("id, title, description, starts_at, duration_minutes, status, class:classes(name), participants:meeting_participants(count)")
      .eq("teacher_id", profile.id)
      .order("starts_at", { ascending: false })
      .limit(200),
  ]);
  const classes = must(classesRes) as { id: string; name: string }[];
  const meetings = must(meetingsRes) as unknown as Row[];
  const now = Date.now();
  const upcoming = meetings.filter((x) => !isPast(x, now)).reverse();
  const past = meetings.filter((x) => isPast(x, now));

  const statusBadge = (x: Row) =>
    x.status === "cancelled" ? (
      <Badge tone="red">{m.statusCancelled}</Badge>
    ) : x.status === "ended" || isPast(x, now) ? (
      <Badge tone="slate">{m.statusEnded}</Badge>
    ) : x.status === "live" ? (
      <Badge tone="teal">{m.statusLive}</Badge>
    ) : (
      <Badge tone="navy">{m.statusScheduled}</Badge>
    );

  const item = (x: Row, isUpcoming: boolean) => (
    <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
        <Video className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-navy-900">{x.title}</p>
          {statusBadge(x)}
        </div>
        <p className="text-xs text-slate-500">
          <LocalTime value={x.starts_at} locale={locale} /> · {x.duration_minutes} {m.minutes}
          {one(x.class)?.name ? ` · ${one(x.class)!.name}` : ""}
        </p>
        {x.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{x.description}</p>}
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {countOf(x.participants)} {m.participants}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isUpcoming &&
          (canJoin(x, now) ? (
            <a href={`/teacher/meetings/${x.id}/join`} target="_blank" rel="noopener" className="btn-primary">
              <Video className="h-4 w-4" aria-hidden />
              {m.join}
            </a>
          ) : (
            <span className="text-xs text-slate-500">{m.notYet}</span>
          ))}
        {isUpcoming && x.status === "live" && (
          <form action={endMeeting}>
            <input type="hidden" name="id" value={x.id} />
            <button type="submit" className="btn-secondary">
              <Square className="h-4 w-4" aria-hidden />
              {m.end}
            </button>
          </form>
        )}
        {isUpcoming && x.status === "scheduled" && (
          <ConfirmForm action={cancelMeeting} confirmMessage={m.cancelConfirm}>
            <input type="hidden" name="id" value={x.id} />
            <button type="submit" className="btn-ghost-danger" aria-label={m.cancel} title={m.cancel}>
              <XCircle className="h-4 w-4" aria-hidden />
            </button>
          </ConfirmForm>
        )}
        {!isUpcoming && (
          <ConfirmForm action={deleteMeeting} confirmMessage={m.deleteConfirm}>
            <input type="hidden" name="id" value={x.id} />
            <button type="submit" className="btn-ghost-danger" aria-label={t.common.delete} title={t.common.delete}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </ConfirmForm>
        )}
      </div>
    </li>
  );

  return (
    <>
      <PageHeader title={m.title} subtitle={m.subtitle} />

      {classes.length === 0 ? (
        <section className="card space-y-4 p-6 text-sm text-slate-600">
          <p>{m.noClass}</p>
          <Link href="/teacher/classes/new" className="btn-primary">
            {t.teacher.classes.new}
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section className="card p-5">
              <h2 className="section-title mb-2">{m.upcoming}</h2>
              {upcoming.length === 0 ? (
                <EmptyState text={m.empty} />
              ) : (
                <ul className="divide-y divide-slate-100">{upcoming.map((x) => item(x, true))}</ul>
              )}
            </section>
            <section className="card p-5">
              <h2 className="section-title mb-2">{m.past}</h2>
              {past.length === 0 ? (
                <p className="text-sm text-slate-500">{m.emptyPast}</p>
              ) : (
                <ul className="divide-y divide-slate-100">{past.map((x) => item(x, false))}</ul>
              )}
            </section>
          </div>

          <section className="card h-fit p-5 xl:order-none order-first">
            <h2 className="section-title mb-4">{m.new}</h2>
            <Form action={createMeeting} resetOnSuccess>
              <SelectField
                label={m.class}
                name="class_id"
                required
                placeholder="—"
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Field label={m.titleLabel} name="title" required />
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                <Field label={m.startsAt} name="starts_local" type="datetime-local" required dir="ltr" />
                <SelectField
                  label={m.duration}
                  name="duration_minutes"
                  defaultValue="60"
                  options={DURATIONS.map((d) => ({ value: String(d), label: `${d} ${m.minutes}` }))}
                />
              </div>
              <LocalToIso source="starts_local" target="starts_at" />
              <TextareaField label={m.description} name="description" rows={3} />
              <SubmitButton pendingLabel={t.common.saving} className="w-full">
                {m.create}
              </SubmitButton>
              <p className="text-xs text-slate-500">{m.help}</p>
            </Form>
          </section>
        </div>
      )}
    </>
  );
}
