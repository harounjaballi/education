"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { fail, parseForm, teacherContext, zOptText, zText } from "@/lib/server-actions";

const meetingSchema = z.object({
  class_id: z.string().uuid("required"),
  title: zText(200),
  description: zOptText(2000),
  starts_at: z
    .string({ required_error: "required" })
    .min(1, "required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "invalidField"),
  duration_minutes: z.coerce.number({ message: "invalidField" }).int("invalidField").min(5, "invalidField").max(480, "invalidField"),
});

function refresh() {
  revalidatePath("/teacher/meetings");
  revalidatePath("/student/meetings");
  revalidatePath("/teacher");
  revalidatePath("/student");
}

/** Programme une séance pour une de ses classes (la RLS vérifie que la classe est la sienne). */
export async function createMeeting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(meetingSchema, formData, ctx.t);
  if (parsed.fail) {
    // L'erreur de date s'affiche sous le champ visible.
    const fe = parsed.fail.fieldErrors;
    if (fe?.starts_at) fe.starts_local = fe.starts_at;
    return parsed.fail;
  }

  const { data, error } = await ctx.supabase
    .from("meetings")
    .insert({
      ...parsed.data,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      teacher_id: ctx.userId,
      provider: "jitsi",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createMeeting]", error?.code, error?.message);
    return fail(ctx.t, error?.code === "42501" ? "forbidden" : "generic", formData);
  }

  await ctx.log("meeting.create", "meetings", data.id, { class_id: parsed.data.class_id, title: parsed.data.title });
  refresh();
  return { ok: true, message: ctx.t.teacher.meetings.createdOk };
}

async function setStatus(formData: FormData, status: "ended" | "cancelled") {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await ctx.supabase.from("meetings").update({ status }).eq("id", id.data).eq("teacher_id", ctx.userId);
  if (error) throw new Error(error.message);
  await ctx.log(`meeting.${status === "ended" ? "end" : "cancel"}`, "meetings", id.data);
  refresh();
}

export async function endMeeting(formData: FormData) {
  await setStatus(formData, "ended");
}

export async function cancelMeeting(formData: FormData) {
  await setStatus(formData, "cancelled");
}

export async function deleteMeeting(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await ctx.supabase.from("meetings").delete().eq("id", id.data).eq("teacher_id", ctx.userId);
  if (error) throw new Error(error.message);
  await ctx.log("meeting.delete", "meetings", id.data);
  refresh();
}
