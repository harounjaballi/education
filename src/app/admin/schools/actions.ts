"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { adminContext, fail, parseForm, zCheckbox, zOptText, zText } from "@/lib/server-actions";

const schoolSchema = z.object({
  name: zText(200).refine((v) => v.length >= 2, "invalidField"),
  city: zOptText(120),
  address: zOptText(300),
  phone: zOptText(40),
  is_active: zCheckbox,
});

export async function createSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(schoolSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { data, error } = await ctx.supabase.from("schools").insert(parsed.data).select("id").single();
  if (error || !data) return fail(ctx.t, "generic", formData);

  await ctx.log("school.create", "schools", data.id, { name: parsed.data.name });
  revalidatePath("/admin/schools");
  return { ok: true, message: ctx.t.admin.schools.createdOk };
}

export async function updateSchool(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(schoolSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase.from("schools").update(parsed.data).eq("id", id);
  if (error) return fail(ctx.t, "generic", formData);

  await ctx.log("school.update", "schools", id, { name: parsed.data.name });
  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${id}`);
  return { ok: true, message: ctx.t.admin.schools.updatedOk };
}

export async function deleteSchool(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const { error } = await ctx.supabase.from("schools").delete().eq("id", id.data);
  if (error) throw new Error(error.message);

  await ctx.log("school.delete", "schools", id.data);
  revalidatePath("/admin/schools");
  redirect("/admin/schools");
}
