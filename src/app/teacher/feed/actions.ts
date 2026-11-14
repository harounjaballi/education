"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import {
  fail,
  parseForm,
  teacherContext,
  zCheckbox,
  zOptText,
} from "@/lib/server-actions";

const postSchema = z.object({
  class_id: z.string().uuid("required"),
  kind: z.enum(["info", "grades", "homework", "important"], {
    message: "invalidField",
  }),
  title: zOptText(200),
  body: z.string().trim().min(1, "required").max(10_000, "tooLong"),
  pinned: zCheckbox,
});

function refresh() {
  revalidatePath("/teacher/feed");
  revalidatePath("/student/feed");
}

/** Publie dans le fil d'une classe. La RLS vérifie que la classe est bien la sienne. */
export async function createPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(postSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase
    .from("class_posts")
    .insert({ ...parsed.data, teacher_id: ctx.userId });
  if (error) {
    console.error("[createPost]", error.code, error.message);
    return fail(
      ctx.t,
      error.code === "42501" ? "forbidden" : "generic",
      formData,
    );
  }

  await ctx.log("class_post.create", "class_posts", null, {
    class_id: parsed.data.class_id,
    kind: parsed.data.kind,
  });
  refresh();
  return { ok: true, message: ctx.t.feed.publishedOk };
}

export async function togglePin(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const pinned = formData.get("pinned") === "1";

  await ctx.supabase
    .from("class_posts")
    .update({ pinned })
    .eq("id", id.data)
    .eq("teacher_id", ctx.userId);
  refresh();
}

export async function deletePost(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const { error } = await ctx.supabase
    .from("class_posts")
    .delete()
    .eq("id", id.data)
    .eq("teacher_id", ctx.userId);
  if (error) throw new Error(error.message);
  await ctx.log("class_post.delete", "class_posts", id.data);
  refresh();
}
