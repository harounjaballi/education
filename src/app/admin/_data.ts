import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Listes d'options pour les formulaires d'administration. */
export async function getSchoolOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("id, name").order("name");
  return (data ?? []).map((s) => ({ value: s.id as string, label: s.name as string }));
}

export async function getLevelOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("levels").select("name").order("position").order("name");
  return (data ?? []).map((l) => ({ value: l.name as string, label: l.name as string }));
}

export async function getTeacherOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "teacher")
    .order("full_name");
  return (data ?? []).map((p) => ({
    value: p.id as string,
    label: (p.full_name as string) || (p.email as string),
  }));
}

export async function getAcademicYear() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("academic_year").maybeSingle();
  return (data?.academic_year as string | undefined) ?? "2026-2027";
}

/** PostgREST renvoie un objet ou un tableau selon la relation : normalise en objet. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function countOf(v: unknown): number {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return (arr[0] as { count?: number } | undefined)?.count ?? 0;
}
