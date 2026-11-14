import "server-only";
import { z, type ZodError, type ZodTypeAny } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import type { ActionState } from "@/lib/action-state";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type ErrorKey = keyof Dictionary["errors"];

/** Valeurs texte du formulaire (mots de passe exclus) pour réafficher la saisie. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$") && !/password/i.test(k)) values[k] = v;
  });
  return values;
}

/**
 * Valide un FormData avec un schéma Zod.
 * Les messages des schémas sont des clés de `errors` (ex. "passwordMin"), traduites ici.
 */
export function parseForm<S extends ZodTypeAny>(
  schema: S,
  formData: FormData,
  t: Dictionary,
): { data: z.infer<S>; fail?: never } | { data?: never; fail: ActionState } {
  const raw = Object.fromEntries(
    [...formData.keys()].filter((k) => !k.startsWith("$")).map((k) => [k, formData.get(k)]),
  );
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { data: parsed.data };
  return { fail: zodFail(parsed.error, formData, t) };
}

function zodFail(error: ZodError, formData: FormData, t: Dictionary): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (fieldErrors[key]) continue;
    fieldErrors[key] = (t.errors as Record<string, string>)[issue.message] ?? t.errors.invalidField;
  }
  return { error: t.errors.validation, fieldErrors, values: formValues(formData) };
}

export function fail(t: Dictionary, key: ErrorKey, formData?: FormData, field?: string): ActionState {
  return {
    error: t.errors[key],
    ...(field ? { fieldErrors: { [field]: t.errors[key] } } : {}),
    ...(formData ? { values: formValues(formData) } : {}),
  };
}

// ---------- Champs Zod réutilisables (messages = clés de traduction) ----------
export const zText = (max = 200) => z.string({ required_error: "required" }).trim().min(1, "required").max(max, "tooLong");
export const zOptText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .optional()
    .transform((v) => (v ? v : null));
export const zOptUuid = z
  .union([z.literal(""), z.string().uuid("invalidField")])
  .optional()
  .transform((v) => (v ? v : null));
export const zEmail = z.string().trim().toLowerCase().min(1, "required").email("email").max(254, "tooLong");
export const zPassword = z.string().min(8, "passwordMin").max(72, "tooLong");
export const zCheckbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");
export const zOptDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidField")])
  .optional()
  .transform((v) => (v ? v : null));

/**
 * Contexte d'une action réservée au super admin.
 * Vérifié à CHAQUE appel : une Server Action est un endpoint public,
 * la protection du layout ne suffit pas.
 */
export async function adminContext() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { t, ok: false as const };
  const { data: me } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!me || me.role !== "super_admin" || me.status !== "active") return { t, ok: false as const };

  const log = (action: string, entity: string, entityId?: string | null, metadata: Record<string, unknown> = {}) =>
    supabase.rpc("log_action", {
      p_action: action,
      p_entity: entity,
      p_entity_id: entityId ?? null,
      p_metadata: metadata,
    });

  return { t, ok: true as const, supabase, userId: user.id, log };
}

/**
 * Contexte d'une action réservée à un enseignant actif.
 * La RLS limite ensuite chaque requête à ses propres classes et élèves.
 */
export async function teacherContext() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { t, ok: false as const };
  const { data: me } = await supabase.from("profiles").select("role, status, school_id").eq("id", user.id).single();
  if (!me || me.role !== "teacher" || me.status !== "active") return { t, ok: false as const };

  const log = (action: string, entity: string, entityId?: string | null, metadata: Record<string, unknown> = {}) =>
    supabase.rpc("log_action", {
      p_action: action,
      p_entity: entity,
      p_entity_id: entityId ?? null,
      p_metadata: metadata,
    });

  return { t, ok: true as const, supabase, userId: user.id, schoolId: (me.school_id as string | null) ?? null, log };
}

/** Code d'erreur Postgres « violation d'unicité ». */
export const isUniqueViolation = (err: { code?: string } | null | undefined) => err?.code === "23505";
