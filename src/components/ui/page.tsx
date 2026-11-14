import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import clsx from "clsx";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 space-y-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-navy-950 sm:text-[32px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-[15px] text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/** Bandeau de confirmation après redirection (?ok=…). */
export function Flash({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 animate-fade-up"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "teal" | "amber" | "slate" | "navy" | "red" | "violet";
}) {
  const tones = {
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    navy: "bg-navy-50 text-navy-700 ring-navy-100",
    red: "bg-red-50 text-red-700 ring-red-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE = {
  active: "teal",
  suspended: "amber",
  disabled: "slate",
} as const;

/** Tableau responsive (défilement horizontal sur petit écran). */
export function Table({
  head,
  children,
  minWidth = 640,
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead className="border-b border-slate-200/70 bg-brand-soft/50 text-start text-xs font-semibold text-slate-600">
            <tr>
              {head.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-3 text-start font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-slate-500"
      >
        {text}
      </td>
    </tr>
  );
}

/** Recherche par requête GET (fonctionne sans JavaScript). */
export function SearchForm({
  defaultValue,
  placeholder,
  label,
  extra,
}: {
  defaultValue?: string;
  placeholder: string;
  label: string;
  extra?: React.ReactNode;
}) {
  return (
    <form method="get" className="mb-4 flex flex-wrap gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={label}
          className="input ps-9"
        />
      </div>
      {extra}
      <button type="submit" className="btn-secondary">
        {label}
      </button>
    </form>
  );
}

export function Pagination({
  page,
  totalPages,
  buildHref,
  labels,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; page: string; of: string };
}) {
  if (totalPages <= 1) return null;
  const linkCls =
    "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition";
  return (
    <nav
      className="mt-4 flex items-center justify-between gap-3 text-sm"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className={clsx(linkCls, "text-navy-900 hover:bg-slate-100")}
        >
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-500">
        {labels.page} {page} {labels.of} {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className={clsx(linkCls, "text-navy-900 hover:bg-slate-100")}
        >
          {labels.next}
          <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Nettoie une saisie de recherche avant de l'insérer dans un filtre PostgREST. */
export function sanitizeSearch(q?: string) {
  return (q ?? "")
    .replace(/[,()%*\\:"']/g, " ")
    .trim()
    .slice(0, 80);
}

export function pageNumber(raw?: string) {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
