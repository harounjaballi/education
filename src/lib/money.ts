import type { Locale } from "@/lib/types";

/** Délai au-delà duquel un utilisateur n'est plus considéré « en ligne ». */
export const ONLINE_WINDOW_MS = 2 * 60_000;

export function isOnline(
  lastSeen: string | null | undefined,
  now = Date.now(),
) {
  return !!lastSeen && now - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

export function formatMoney(amount: number, currency: string, locale: Locale) {
  const n = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount);
  return `${n} ${currency}`;
}

/** « 2026-11 » → premier jour du mois « 2026-11-01 ». */
export function periodOf(month: string) {
  return `${month}-01`;
}

/** Mois courant au format « 2026-11 ». */
export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function isMonth(v: string | undefined): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function formatMonth(period: string, locale: Locale) {
  const [y, m] = period.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
