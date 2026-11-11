"use client";
import { AlertTriangle, RotateCcw } from "lucide-react";

/** Squelette de chargement commun aux tableaux de bord. */
export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-64 rounded-lg bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[118px] rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-slate-200/60" />
        <div className="h-72 rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}

/** Affichage d'erreur avec relance (utilisé par les error.tsx). */
export function ErrorView({ reset }: { reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 font-semibold text-navy-900">Une erreur est survenue · حدث خطأ</h2>
      <p className="mt-1 text-sm text-slate-500">Les données n&apos;ont pas pu être chargées.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        <RotateCcw className="h-4 w-4" aria-hidden />
        Réessayer · إعادة المحاولة
      </button>
    </div>
  );
}
