import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

// Pastilles pleines et colorées ; « navy » prend la couleur de l'espace courant.
const TONES = {
  navy: "bg-gradient-to-br from-brand to-brand-2 text-white",
  teal: "bg-gradient-to-br from-teal-400 to-teal-600 text-white",
  amber: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  violet: "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="card group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div
        aria-hidden
        className={clsx(
          "pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-25",
          TONES[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={clsx(
            "grid h-11 w-11 place-items-center rounded-2xl shadow-[0_8px_20px_-8px_rgba(10,26,49,0.45)] ring-1 ring-white/30",
            TONES[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="relative mt-3 font-display text-[32px] font-bold leading-none tracking-tight text-navy-950 tabular-nums">
        {value}
      </p>
      {hint && <p className="relative mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("card flex flex-col p-5", className)}>
      <h2 className="section-title mb-4">{title}</h2>
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-brand/25 bg-brand-soft/40 px-4 py-10 text-center text-sm text-slate-600">
      {text}
    </div>
  );
}
