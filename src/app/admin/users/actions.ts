"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { createServiceClient } from "@/lib/supabase/server";
import {
  adminContext,
  fail,
  isUniqueViolation,
  parseForm,
  zEmail,
  zOptDate,
  zOptText,
  zOptUuid,
  zPassword,
  zText,
} from "@/lib/server-actions";

export type ManagedRole = "teacher" | "student";

const base = { full_name: zText(120), email: zEmail, school_id: zOptUuid };
const teacherExtra = { specialty: zOptText(120), phone: zOptText(40) };
const studentExtra = {
  student_code: zOptText(40),
  level: zOptText(80),
  birth_date: zOptDate,
  guardian_phone: zOptText(40),
};

const schemas = {
  teacher: z.object({ ...base, ...teacherExtra }),
  student: z.object({ ...base, ...studentExtra }),
};
const createSchemas = {
  teacher: schemas.teacher.extend({ password: zPassword }),
  student: schemas.student.extend({ password: zPassword }),
};

type Extras = Record<string, string | null>;

function splitExtras(role: ManagedRole, data: Record<string, unknown>): Extras {
  const keys = role === "teacher" ? Object.keys(teacherExtra) : Object.keys(studentExtra);
  return Object.fromEntries(keys.map((k) => [k, (data[k] as string | null) ?? null]));
}

const roleSchema = z.enum(["teacher", "student"]);
const listPath = (role: ManagedRole) => `/admin/${role}s`;

function serviceOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Création de compte (Auth + profil + fiche enseignant/élève)
// ---------------------------------------------------------------------------
export async function createUser(role: ManagedRole, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!roleSchema.safeParse(role).success) return fail(ctx.t, "forbidden");

  const parsed = parseForm(createSchemas[role], formData, ctx.t);
  if (parsed.fail) return parsed.fail;
  const data = parsed.data as z.infer<(typeof createSchemas)["teacher"]> & Record<string, unknown>;

  const service = serviceOrNull();
  if (!service) return fail(ctx.t, "serviceKey", formData);

  // Le rôle est placé dans app_metadata : le trigger handle_new_user crée le profil avec ce rôle.
  const { data: created, error } = await service.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: data.full_name },
  });

  if (error || !created.user) {
    console.error("[createUser] auth.admin.createUser", error?.status, error?.code, error?.message);
    if (error && (error.status === 422 || /already|registered|exists/i.test(error.message)))
      return fail(ctx.t, "emailTaken", formData, "email");
    return fail(ctx.t, "generic", formData);
  }

  const uid = created.user.id;
  const rollback = async (key: "generic" | "codeTaken", field?: string) => {
    await service.auth.admin.deleteUser(uid);
    return fail(ctx.t, key, formData, field);
  };

  const { data: settings } = await service.from("platform_settings").select("default_locale").maybeSingle();
  const { error: profileError } = await service
    .from("profiles")
    .update({
      // Supabase n'enregistre app_metadata qu'après l'insertion : le trigger
      // handle_new_user voit donc toujours « student ». On impose le bon rôle ici.
      role,
      full_name: data.full_name,
      school_id: data.school_id,
      locale: settings?.default_locale === "ar" ? "ar" : "fr",
    })
    .eq("id", uid);
  if (profileError) {
    console.error("[createUser] profiles.update", profileError.code, profileError.message);
    return rollback("generic");
  }

  // Supprime la fiche créée à tort par le trigger, puis crée/complète la bonne.
  await service.from(role === "teacher" ? "students" : "teachers").delete().eq("id", uid);
  const { error: extraError } = await service
    .from(role === "teacher" ? "teachers" : "students")
    .upsert({ id: uid, ...splitExtras(role, data) });
  if (extraError) console.error("[createUser] extras.update", extraError.code, extraError.message);
  if (extraError) return rollback(isUniqueViolation(extraError) ? "codeTaken" : "generic", "student_code");

  await ctx.log(`${role}.create`, "profiles", uid, { email: data.email });
  revalidatePath(listPath(role));
  // Navigation faite par le navigateur (voir Form) : la redirection serveur affichait un 404.
  return { ok: true, redirectTo: `${listPath(role)}/${uid}?ok=created` };
}

// ---------------------------------------------------------------------------
// Vérifie que la cible existe et a bien le rôle attendu (jamais un super admin)
// ---------------------------------------------------------------------------
async function loadTarget(
  ctx: Extract<Awaited<ReturnType<typeof adminContext>>, { ok: true }>,
  id: string,
  role: ManagedRole,
) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { data } = await ctx.supabase.from("profiles").select("id, role, email").eq("id", id).maybeSingle();
  if (!data || data.role !== role) return null;
  return data as { id: string; role: ManagedRole; email: string };
}

// ---------------------------------------------------------------------------
// Mise à jour du profil
// ---------------------------------------------------------------------------
export async function updateUser(
  id: string,
  role: ManagedRole,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const target = await loadTarget(ctx, id, role);
  if (!target) return fail(ctx.t, "forbidden");

  const parsed = parseForm(schemas[role], formData, ctx.t);
  if (parsed.fail) return parsed.fail;
  const data = parsed.data as z.infer<(typeof schemas)["teacher"]> & Record<string, unknown>;

  if (data.email !== target.email) {
    const service = serviceOrNull();
    if (!service) return fail(ctx.t, "serviceKey", formData);
    const { error } = await service.auth.admin.updateUserById(id, { email: data.email, email_confirm: true });
    if (error) {
      return /already|registered|exists/i.test(error.message) || error.status === 422
        ? fail(ctx.t, "emailTaken", formData, "email")
        : fail(ctx.t, "generic", formData);
    }
  }

  const { error: profileError } = await ctx.supabase
    .from("profiles")
    .update({ full_name: data.full_name, school_id: data.school_id, email: data.email })
    .eq("id", id);
  if (profileError) return fail(ctx.t, "generic", formData);

  const { error: extraError } = await ctx.supabase
    .from(role === "teacher" ? "teachers" : "students")
    .update(splitExtras(role, data))
    .eq("id", id);
  if (extraError)
    return isUniqueViolation(extraError)
      ? fail(ctx.t, "codeTaken", formData, "student_code")
      : fail(ctx.t, "generic", formData);

  await ctx.log(`${role}.update`, "profiles", id);
  revalidatePath(listPath(role));
  revalidatePath(`${listPath(role)}/${id}`);
  return { ok: true, message: ctx.t.admin.users.updatedOk };
}

// ---------------------------------------------------------------------------
// Statut : actif / suspendu / désactivé (bloque aussi la connexion côté Auth)
// ---------------------------------------------------------------------------
export async function setUserStatus(
  id: string,
  role: ManagedRole,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (id === ctx.userId) return fail(ctx.t, "self");
  const target = await loadTarget(ctx, id, role);
  if (!target) return fail(ctx.t, "forbidden");

  const status = z.enum(["active", "suspended", "disabled"]).safeParse(formData.get("status"));
  if (!status.success) return fail(ctx.t, "validation");

  const service = serviceOrNull();
  if (!service) return fail(ctx.t, "serviceKey");

  // Bannir côté Auth empêche toute nouvelle connexion et le rafraîchissement des jetons.
  const { error: banError } = await service.auth.admin.updateUserById(id, {
    ban_duration: status.data === "active" ? "none" : "876000h",
  });
  if (banError) return fail(ctx.t, "generic");

  const { error } = await ctx.supabase.from("profiles").update({ status: status.data }).eq("id", id);
  if (error) return fail(ctx.t, "generic");

  await ctx.log(`${role}.status`, "profiles", id, { status: status.data });
  revalidatePath(listPath(role));
  revalidatePath(`${listPath(role)}/${id}`);
  return { ok: true, message: ctx.t.admin.users.statusUpdated };
}

// ---------------------------------------------------------------------------
// Réinitialisation du mot de passe
// ---------------------------------------------------------------------------
export async function resetPassword(
  id: string,
  role: ManagedRole,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const target = await loadTarget(ctx, id, role);
  if (!target) return fail(ctx.t, "forbidden");

  const parsed = parseForm(z.object({ password: zPassword }), formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const service = serviceOrNull();
  if (!service) return fail(ctx.t, "serviceKey");
  const { error } = await service.auth.admin.updateUserById(id, { password: parsed.data.password });
  if (error) return fail(ctx.t, "generic");

  await ctx.log(`${role}.password_reset`, "profiles", id);
  return { ok: true, message: ctx.t.admin.users.passwordUpdated };
}

// ---------------------------------------------------------------------------
// Suppression définitive
// ---------------------------------------------------------------------------
export async function deleteUser(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const role = roleSchema.safeParse(formData.get("role"));
  const id = String(formData.get("id") ?? "");
  if (!role.success || id === ctx.userId) return;
  const target = await loadTarget(ctx, id, role.data);
  if (!target) return;

  const service = serviceOrNull();
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");

  await ctx.log(`${role.data}.delete`, "profiles", id, { email: target.email });
  // Supprimer l'utilisateur Auth supprime son profil et ses données en cascade.
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath(listPath(role.data));
  redirect(listPath(role.data));
}
