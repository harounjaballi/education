import "server-only";
import { cookies } from "next/headers";
import { dictionaries } from "./dictionaries";
import type { Locale } from "@/lib/types";

export const LOCALE_COOKIE = "edu_locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "ar" ? "ar" : "fr";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale], dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const) };
}

export function formatDate(value: string | Date, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-FR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}
