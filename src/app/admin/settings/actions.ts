"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { adminContext, fail, isUniqueViolation, parseForm, zText } from "@/lib/server-actions";

const settingsSchema = z.object({
  platform_name: zText(80).refine((v) => v.length >= 2, "invalidField"),
  academic_year: z.string().trim().regex(/^\d{4}-\d{4}$/, "year"),
  support_email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("email").max(254, "tooLong")])
    .optional()
    .transform((v) => (v ? v : null)),
  default_locale: z.enum(["fr", "ar"], { message: "invalidField" }),
});

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(settingsSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase
    .from("platform_settings")
    .update({ ...parsed.data, updated_by: ctx.userId })
    .eq("id", true);
  if (error) return fail(ctx.t, "generic", formData);

  await ctx.log("settings.update", "platform_settings", null, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: ctx.t.admin.settings.savedOk };
}

export async function addLevel(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(z.object({ name: zText(80) }), formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { data: last } = await ctx.supabase
    .from("levels")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await ctx.supabase
    .from("levels")
    .insert({ name: parsed.data.name, position: ((last?.position as number | undefined) ?? 0) + 1 });
  if (error)
    return isUniqueViolation(error) ? fail(ctx.t, "nameTaken", formData, "name") : fail(ctx.t, "generic", formData);

  await ctx.log("level.create", "levels", null, { name: parsed.data.name });
  revalidatePath("/admin/settings");
  return { ok: true, message: ctx.t.admin.settings.levelAdded };
}

export async function deleteLevel(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const { error } = await ctx.supabase.from("levels").delete().eq("id", id.data);
  if (error) throw new Error(error.message);

  await ctx.log("level.delete", "levels", id.data);
  revalidatePath("/admin/settings");
}
