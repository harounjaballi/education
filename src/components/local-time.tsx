"use client";
import { useEffect, useState } from "react";

/**
 * Date et heure affichées dans le fuseau du navigateur (le serveur Vercel est en UTC).
 * Rendu serveur en UTC, puis corrigé à l'hydratation.
 */
export function LocalTime({ value, locale }: { value: string; locale: "fr" | "ar" }) {
  const fmt = (tz?: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      ...(tz ? { timeZone: tz } : {}),
    }).format(new Date(value));
  const [text, setText] = useState(() => fmt("UTC"));
  useEffect(() => setText(fmt()), [value, locale]);
  return (
    <time dateTime={value} suppressHydrationWarning>
      {text}
    </time>
  );
}

/**
 * Champ caché `target` rempli en ISO (UTC) à partir du champ datetime-local `source`
 * du même formulaire, pour que l'heure saisie soit celle du fuseau de l'enseignant.
 */
export function LocalToIso({ source, target }: { source: string; target: string }) {
  const [iso, setIso] = useState("");
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(`input[name="${source}"]`);
    if (!input) return;
    const sync = () => {
      const d = input.value ? new Date(input.value) : null;
      setIso(d && !Number.isNaN(d.getTime()) ? d.toISOString() : "");
    };
    sync();
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    input.form?.addEventListener("reset", () => setIso(""));
    return () => {
      input.removeEventListener("input", sync);
      input.removeEventListener("change", sync);
    };
  }, [source]);
  return <input type="hidden" name={target} value={iso} />;
}
