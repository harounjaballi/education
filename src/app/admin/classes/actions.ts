"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { adminContext, fail, isUniqueViolation, parseForm, zOptText, zOptUuid, zText } from "@/lib/server-actions";

const classSchema = z.object({
  name: zText(120),
  teacher_id: z.string().uuid("required"),
  school_id: zOptUuid,
  level: zOptText(80),
  academic_year: z.string().trim().regex(/^\d{4}-\d{4}$/, "year"),
  description: zOptText(1000),
});

async function isTeacher(ctx: Extract<Awaited<ReturnType<typeof adminContext>>, { ok: true }>, id: string) {
  const { data } = await ctx.supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  return data?.role === "teacher";
}

export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(classSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;
  if (!(await isTeacher(ctx, parsed.data.teacher_id))) return fail(ctx.t, "invalidField", formData, "teacher_id");

  const { data, error } = await ctx.supabase.from("classes").insert(parsed.data).select("id").single();
  if (error || !data) return fail(ctx.t, "generic", formData);

  await ctx.log("class.create", "classes", data.id, { name: parsed.data.name });
  revalidatePath("/admin/classes");
  redirect(`/admin/classes/${data.id}?ok=created`);
}

export async function updateClass(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(classSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { data: current } = await ctx.supabase
    .from("classes")
    .select("teacher_id, subjects(count)")
    .eq("id", id)
    .maybeSingle();
  if (!current) return fail(ctx.t, "forbidden");

  if (current.teacher_id !== parsed.data.teacher_id) {
    // Les matières, cours et devoirs appartiennent à l'enseignant : on ne transfère pas une classe déjà alimentée.
    const subjects = (current.subjects as unknown as { count: number }[])[0]?.count ?? 0;
    if (subjects > 0) return fail(ctx.t, "teacherLocked", formData, "teacher_id");
    if (!(await isTeacher(ctx, parsed.data.teacher_id))) return fail(ctx.t, "invalidField", formData, "teacher_id");
  }

  const { error } = await ctx.supabase.from("classes").update(parsed.data).eq("id", id);
  if (error) return fail(ctx.t, "generic", formData);

  await ctx.log("class.update", "classes", id, { name: parsed.data.name });
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  return { ok: true, message: ctx.t.admin.classes.updatedOk };
}

export async function deleteClass(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const { error } = await ctx.supabase.from("classes").delete().eq("id", id.data);
  if (error) throw new Error(error.message);

  await ctx.log("class.delete", "classes", id.data);
  revalidatePath("/admin/classes");
  redirect("/admin/classes");
}

export async function enrollStudent(classId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const studentId = z.string().uuid().safeParse(formData.get("student_id"));
  if (!studentId.success) return fail(ctx.t, "required", undefined, "student_id");

  const { error } = await ctx.supabase.from("enrollments").insert({ class_id: classId, student_id: studentId.data });
  if (error && !isUniqueViolation(error)) return fail(ctx.t, "generic");

  await ctx.log("enrollment.create", "enrollments", classId, { student_id: studentId.data });
  revalidatePath(`/admin/classes/${classId}`);
  return { ok: true, message: ctx.t.admin.classes.enrolledOk };
}

export async function unenrollStudent(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx.ok) return;
  const ids = z
    .object({ class_id: z.string().uuid(), student_id: z.string().uuid() })
    .safeParse({ class_id: formData.get("class_id"), student_id: formData.get("student_id") });
  if (!ids.success) return;

  const { error } = await ctx.supabase
    .from("enrollments")
    .delete()
    .eq("class_id", ids.data.class_id)
    .eq("student_id", ids.data.student_id);
  if (error) throw new Error(error.message);

  await ctx.log("enrollment.delete", "enrollments", ids.data.class_id, { student_id: ids.data.student_id });
  revalidatePath(`/admin/classes/${ids.data.class_id}`);
}
