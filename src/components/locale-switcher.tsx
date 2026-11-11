import { Languages } from "lucide-react";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/types";

/** Bascule FR ↔ AR (Server Action, fonctionne sans JavaScript). */
export function LocaleSwitcher({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const target: Locale = locale === "ar" ? "fr" : "ar";
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={target} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-navy-900"
        aria-label={target === "ar" ? "التبديل إلى العربية" : "Passer en français"}
      >
        <Languages className="h-4 w-4" aria-hidden />
        {!compact && <span>{target === "ar" ? "العربية" : "Français"}</span>}
      </button>
    </form>
  );
}
