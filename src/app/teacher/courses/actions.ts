"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { fail, parseForm, teacherContext, zCheckbox, zOptText, zText } from "@/lib/server-actions";
import { COURSE_FILE_MAX, COURSE_FILE_TYPES, videoProvider } from "@/lib/media";

type Ctx = Extract<Awaited<ReturnType<typeof teacherContext>>, { ok: true }>;

const isUuid = (v: unknown): v is string => z.string().uuid().safeParse(v).success;

// La RLS ne renvoie que les éléments de l'enseignant connecté : ces lectures servent de contrôle d'accès.
async function owned(ctx: Ctx, table: "classes" | "courses" | "chapters" | "lessons", id: string) {
  if (!isUuid(id)) return null;
  const { data } = await ctx.supabase.from(table).select("id").eq("id", id).eq("teacher_id", ctx.userId).maybeSingle();
  return data ? (data.id as string) : null;
}

async function courseOfLesson(ctx: Ctx, lessonId: string) {
  const { data } = await ctx.supabase
    .from("lessons")
    .select("chapter:chapters(course_id)")
    .eq("id", lessonId)
    .eq("teacher_id", ctx.userId)
    .maybeSingle();
  const chapter = data?.chapter as unknown as { course_id: string } | { course_id: string }[] | null;
  return (Array.isArray(chapter) ? chapter[0] : chapter)?.course_id ?? null;
}

async function nextPosition(ctx: Ctx, table: "chapters" | "lessons", column: string, parentId: string) {
  const { count } = await ctx.supabase.from(table).select("id", { count: "exact", head: true }).eq(column, parentId);
  return count ?? 0;
}

function refreshCourse(courseId: string) {
  revalidatePath("/teacher/courses");
  revalidatePath(`/teacher/courses/${courseId}`);
  revalidatePath("/student/courses");
}

// ---------------------------------------------------------------------------
// Cours
// ---------------------------------------------------------------------------
const courseSchema = z.object({
  title: zText(200),
  description: zOptText(2000),
  is_published: zCheckbox,
});

export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(
    courseSchema.extend({ class_id: z.string().uuid("required"), subject: zText(120) }),
    formData,
    ctx.t,
  );
  if (parsed.fail) return parsed.fail;
  const { class_id, subject, ...course } = parsed.data;
  if (!(await owned(ctx, "classes", class_id))) return fail(ctx.t, "invalidField", formData, "class_id");

  // Matière : réutilisée si elle existe déjà dans la classe, sinon créée.
  const { data: existing } = await ctx.supabase
    .from("subjects")
    .select("id")
    .eq("class_id", class_id)
    .eq("teacher_id", ctx.userId)
    .ilike("name", subject.replace(/[%_\\]/g, "\\$&"))
    .limit(1)
    .maybeSingle();
  let subjectId = existing?.id as string | undefined;
  if (!subjectId) {
    const { data: created, error } = await ctx.supabase
      .from("subjects")
      .insert({ class_id, teacher_id: ctx.userId, name: subject })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[createCourse] subjects.insert", error?.code, error?.message);
      return fail(ctx.t, "generic", formData);
    }
    subjectId = created.id as string;
  }

  const { data, error } = await ctx.supabase
    .from("courses")
    .insert({ ...course, subject_id: subjectId, teacher_id: ctx.userId })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createCourse] courses.insert", error?.code, error?.message);
    return fail(ctx.t, "generic", formData);
  }

  await ctx.log("course.create", "courses", data.id, { title: course.title });
  revalidatePath("/teacher/courses");
  return { ok: true, redirectTo: `/teacher/courses/${data.id}?ok=created` };
}

export async function updateCourse(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await owned(ctx, "courses", id))) return fail(ctx.t, "forbidden");
  const parsed = parseForm(courseSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase.from("courses").update(parsed.data).eq("id", id);
  if (error) return fail(ctx.t, "generic", formData);

  await ctx.log("course.update", "courses", id, { title: parsed.data.title });
  refreshCourse(id);
  return { ok: true, message: ctx.t.teacher.courses.updatedOk };
}

export async function deleteCourse(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = String(formData.get("id") ?? "");
  if (!(await owned(ctx, "courses", id))) return;

  // Fichiers du cours à retirer du stockage avant la suppression en cascade.
  const { data: docs } = await ctx.supabase
    .from("documents")
    .select("storage_path, lesson:lessons!inner(chapter:chapters!inner(course_id))")
    .eq("lesson.chapter.course_id", id);
  const paths = (docs ?? []).map((d) => d.storage_path as string);
  if (paths.length) await ctx.supabase.storage.from("course-files").remove(paths);

  const { error } = await ctx.supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await ctx.log("course.delete", "courses", id);
  revalidatePath("/teacher/courses");
  revalidatePath("/student/courses");
  redirect("/teacher/courses");
}

// ---------------------------------------------------------------------------
// Chapitres
// ---------------------------------------------------------------------------
export async function createChapter(courseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await owned(ctx, "courses", courseId))) return fail(ctx.t, "forbidden");
  const parsed = parseForm(z.object({ title: zText(200) }), formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const position = await nextPosition(ctx, "chapters", "course_id", courseId);
  const { error } = await ctx.supabase
    .from("chapters")
    .insert({ course_id: courseId, teacher_id: ctx.userId, title: parsed.data.title, position });
  if (error) {
    console.error("[createChapter]", error.code, error.message);
    return fail(ctx.t, "generic", formData);
  }
  refreshCourse(courseId);
  return { ok: true };
}

export async function deleteChapter(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!(await owned(ctx, "chapters", id))) return;

  const { data: docs } = await ctx.supabase
    .from("documents")
    .select("storage_path, lesson:lessons!inner(chapter_id)")
    .eq("lesson.chapter_id", id);
  const paths = (docs ?? []).map((d) => d.storage_path as string);
  if (paths.length) await ctx.supabase.storage.from("course-files").remove(paths);

  const { error } = await ctx.supabase.from("chapters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refreshCourse(courseId);
}

// ---------------------------------------------------------------------------
// Leçons
// ---------------------------------------------------------------------------
export async function createLesson(chapterId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await owned(ctx, "chapters", chapterId))) return fail(ctx.t, "forbidden");
  const parsed = parseForm(z.object({ title: zText(200) }), formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const position = await nextPosition(ctx, "lessons", "chapter_id", chapterId);
  const { data, error } = await ctx.supabase
    .from("lessons")
    .insert({ chapter_id: chapterId, teacher_id: ctx.userId, title: parsed.data.title, position, is_published: true })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createLesson]", error?.code, error?.message);
    return fail(ctx.t, "generic", formData);
  }
  return { ok: true, redirectTo: `/teacher/lessons/${data.id}` };
}

export async function updateLesson(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await owned(ctx, "lessons", id))) return fail(ctx.t, "forbidden");
  const parsed = parseForm(
    z.object({ title: zText(200), content: zOptText(50_000), is_published: zCheckbox }),
    formData,
    ctx.t,
  );
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase.from("lessons").update(parsed.data).eq("id", id);
  if (error) return fail(ctx.t, "generic", formData);

  const courseId = await courseOfLesson(ctx, id);
  if (courseId) refreshCourse(courseId);
  revalidatePath(`/teacher/lessons/${id}`);
  return { ok: true, message: ctx.t.teacher.lessons.updatedOk };
}

export async function deleteLesson(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = String(formData.get("id") ?? "");
  if (!(await owned(ctx, "lessons", id))) return;
  const courseId = await courseOfLesson(ctx, id);

  const { data: docs } = await ctx.supabase.from("documents").select("storage_path").eq("lesson_id", id);
  const paths = (docs ?? []).map((d) => d.storage_path as string);
  if (paths.length) await ctx.supabase.storage.from("course-files").remove(paths);

  const { error } = await ctx.supabase.from("lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (courseId) {
    refreshCourse(courseId);
    redirect(`/teacher/courses/${courseId}`);
  }
  redirect("/teacher/courses");
}

// ---------------------------------------------------------------------------
// Fichiers (déjà envoyés dans Storage par le navigateur) et vidéos
// ---------------------------------------------------------------------------
export async function registerDocument(
  lessonId: string,
  file: { name: string; path: string; type: string; size: number },
): Promise<{ ok: boolean }> {
  const ctx = await teacherContext();
  if (!ctx.ok || !(await owned(ctx, "lessons", lessonId))) return { ok: false };

  // Le fichier doit être dans le dossier de l'enseignant, pour cette leçon.
  const prefix = `${ctx.userId}/${lessonId}/`;
  const valid =
    typeof file.path === "string" &&
    file.path.startsWith(prefix) &&
    !file.path.includes("..") &&
    COURSE_FILE_TYPES.includes(file.type) &&
    Number.isFinite(file.size) &&
    file.size > 0 &&
    file.size <= COURSE_FILE_MAX;
  if (!valid) return { ok: false };

  const { error } = await ctx.supabase.from("documents").insert({
    lesson_id: lessonId,
    teacher_id: ctx.userId,
    name: String(file.name).slice(0, 255),
    storage_path: file.path,
    mime_type: file.type,
    size_bytes: Math.round(file.size),
  });
  if (error) {
    console.error("[registerDocument]", error.code, error.message);
    await ctx.supabase.storage.from("course-files").remove([file.path]);
    return { ok: false };
  }
  revalidatePath(`/teacher/lessons/${lessonId}`);
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("id, lesson_id, storage_path")
    .eq("id", id)
    .eq("teacher_id", ctx.userId)
    .maybeSingle();
  if (!doc) return;

  await ctx.supabase.storage.from("course-files").remove([doc.storage_path as string]);
  await ctx.supabase.from("documents").delete().eq("id", id);
  revalidatePath(`/teacher/lessons/${doc.lesson_id}`);
}

export async function addVideo(lessonId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await owned(ctx, "lessons", lessonId))) return fail(ctx.t, "forbidden");
  const parsed = parseForm(
    z.object({
      title: zText(200),
      url: z.string().trim().url("invalidField").max(500, "tooLong").refine((u) => /^https:\/\//i.test(u), "invalidField"),
    }),
    formData,
    ctx.t,
  );
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase.from("videos").insert({
    lesson_id: lessonId,
    teacher_id: ctx.userId,
    title: parsed.data.title,
    url: parsed.data.url,
    provider: videoProvider(parsed.data.url),
  });
  if (error) {
    console.error("[addVideo]", error.code, error.message);
    return fail(ctx.t, "generic", formData);
  }
  revalidatePath(`/teacher/lessons/${lessonId}`);
  return { ok: true, message: ctx.t.teacher.lessons.videoAdded };
}

export async function deleteVideo(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = String(formData.get("id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  if (!isUuid(id)) return;
  await ctx.supabase.from("videos").delete().eq("id", id).eq("teacher_id", ctx.userId);
  revalidatePath(`/teacher/lessons/${lessonId}`);
}
