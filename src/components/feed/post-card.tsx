import { Pin } from "lucide-react";
import clsx from "clsx";
import { Badge } from "@/components/ui/page";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type PostKind = "info" | "grades" | "homework" | "important";
export type Post = {
  id: string;
  kind: PostKind;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  className?: string;
  author?: string;
};

const KIND_TONE: Record<PostKind, "navy" | "teal" | "amber" | "red"> = {
  info: "navy",
  grades: "teal",
  homework: "amber",
  important: "red",
};

/** Publication du fil d'actualité (affichage commun enseignant / élève). */
export function PostCard({
  post,
  t,
  date,
  actions,
}: {
  post: Post;
  t: Dictionary["feed"];
  date: string;
  actions?: React.ReactNode;
}) {
  return (
    <article
      className={clsx(
        "card p-5",
        post.kind === "important" && "border-red-200",
        post.pinned && "ring-2 ring-brand/25",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={KIND_TONE[post.kind]}>{t.kinds[post.kind]}</Badge>
        {post.className && (
          <span className="text-xs font-medium text-slate-600">
            {post.className}
          </span>
        )}
        {post.pinned && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-ink">
            <Pin className="h-3.5 w-3.5" aria-hidden />
            {t.pinnedLabel}
          </span>
        )}
        <span className="ms-auto text-xs text-slate-500">
          {post.author ? `${post.author} · ` : ""}
          {date}
        </span>
      </div>
      {post.title && (
        <h2 className="mb-1.5 text-base font-semibold text-navy-900">
          {post.title}
        </h2>
      )}
      <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">
        {post.body}
      </p>
      {actions && (
        <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
          {actions}
        </div>
      )}
    </article>
  );
}
