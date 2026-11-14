import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/stat-card";
import { PostCard, type Post } from "@/components/feed/post-card";
import { one } from "@/app/admin/_data";

export const metadata = { title: "Fil d'actualité" };

type ClassRef = { id: string; name: string };
type Row = Omit<Post, "className" | "author"> & {
  class: ClassRef | ClassRef[] | null;
  teacher: { profile: { full_name: string } | null } | null;
};

export default async function StudentFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const f = t.feed;

  // RLS : seules les publications des classes où l'élève est inscrit.
  const rows = must(
    await supabase
      .from("class_posts")
      .select(
        "id, kind, title, body, pinned, created_at, class:classes(id, name), teacher:teachers(profile:profiles(full_name))",
      )
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ) as unknown as Row[];

  const classes = [
    ...new Map(
      rows
        .map((r) => one(r.class))
        .filter((c): c is ClassRef => !!c)
        .map((c) => [c.id, c]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const selected = classes.find((c) => c.id === sp.class)?.id;
  const posts = selected
    ? rows.filter((r) => one(r.class)?.id === selected)
    : rows;

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
      <PageHeader title={f.title} subtitle={f.studentSubtitle} />
      <div className="max-w-3xl space-y-4">
        {classes.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label={f.class}>
            {tab("/student/feed", f.allClasses, !selected)}
            {classes.map((c) =>
              tab(`/student/feed?class=${c.id}`, c.name, c.id === selected),
            )}
          </nav>
        )}

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
                className: one(p.class)?.name,
                author: one(one(p.teacher)?.profile)?.full_name,
              }}
              t={f}
              date={formatDate(p.created_at, locale, true)}
            />
          ))
        )}
      </div>
    </>
  );
}
