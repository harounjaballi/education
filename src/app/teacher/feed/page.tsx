import Link from "next/link";
import { Pin, PinOff, Trash2 } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { PageHeader } from "@/components/ui/page";
import {
  CheckboxField,
  ConfirmForm,
  Field,
  Form,
  SelectField,
  SubmitButton,
  TextareaField,
} from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import { PostCard, type Post } from "@/components/feed/post-card";
import { createPost, deletePost, togglePin } from "./actions";

export const metadata = { title: "Fil d'actualité" };

type Row = Omit<Post, "className" | "author"> & { class_id: string };

export default async function TeacherFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const f = t.feed;

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", profile.id)
    .order("name");
  const classes = (classesData ?? []) as { id: string; name: string }[];
  const selected = classes.find((c) => c.id === sp.class)?.id;
  const nameOf = new Map(classes.map((c) => [c.id, c.name]));

  let query = supabase
    .from("class_posts")
    .select("id, class_id, kind, title, body, pinned, created_at")
    .eq("teacher_id", profile.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (selected) query = query.eq("class_id", selected);
  const posts = classes.length ? (must(await query) as Row[]) : [];

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={clsx(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-navy-900 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-navy-900",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title={f.title} subtitle={f.teacherSubtitle} />

      {classes.length === 0 ? (
        <section className="card space-y-4 p-6 text-sm text-slate-600">
          <p>{f.noClass}</p>
          <Link href="/teacher/classes/new" className="btn-primary">
            {t.teacher.classes.new}
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <nav className="flex flex-wrap gap-2" aria-label={f.class}>
              {tab("/teacher/feed", f.allClasses, !selected)}
              {classes.map((c) =>
                tab(`/teacher/feed?class=${c.id}`, c.name, c.id === selected),
              )}
            </nav>

            {posts.length === 0 ? (
              <section className="card p-6">
                <EmptyState text={f.empty} />
              </section>
            ) : (
              posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={{
                    ...p,
                    className: selected ? undefined : nameOf.get(p.class_id),
                  }}
                  t={f}
                  date={formatDate(p.created_at, locale, true)}
                  actions={
                    <>
                      <form action={togglePin}>
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="pinned"
                          value={p.pinned ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          className="btn-ghost-danger text-slate-600 hover:text-navy-900"
                        >
                          {p.pinned ? (
                            <PinOff className="h-4 w-4" aria-hidden />
                          ) : (
                            <Pin className="h-4 w-4" aria-hidden />
                          )}
                          {p.pinned ? f.unpin : f.pin}
                        </button>
                      </form>
                      <ConfirmForm
                        action={deletePost}
                        confirmMessage={f.deleteConfirm}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="btn-ghost-danger">
                          <Trash2 className="h-4 w-4" aria-hidden />
                          {t.common.delete}
                        </button>
                      </ConfirmForm>
                    </>
                  }
                />
              ))
            )}
          </div>

          <section className="card h-fit p-5 lg:sticky lg:top-6">
            <h2 className="section-title mb-4">{f.new}</h2>
            <Form action={createPost} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <SelectField
                  label={f.class}
                  name="class_id"
                  required
                  placeholder="—"
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                  defaultValue={
                    selected ??
                    (classes.length === 1 ? classes[0].id : undefined)
                  }
                />
                <SelectField
                  label={f.kind}
                  name="kind"
                  defaultValue="info"
                  options={(
                    ["info", "grades", "homework", "important"] as const
                  ).map((k) => ({
                    value: k,
                    label: f.kinds[k],
                  }))}
                />
              </div>
              <Field label={f.postTitle} name="title" />
              <TextareaField
                label={f.body}
                name="body"
                rows={7}
                required
                hint={f.bodyPlaceholder}
              />
              <CheckboxField label={f.pinned} name="pinned" />
              <SubmitButton pendingLabel={t.common.saving} className="w-full">
                {f.publish}
              </SubmitButton>
            </Form>
          </section>
        </div>
      )}
    </>
  );
}
