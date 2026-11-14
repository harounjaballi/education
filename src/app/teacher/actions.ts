"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { createServiceClient } from "@/lib/supabase/server";
import {
  fail,
  isUniqueViolation,
  parseForm,
  teacherContext,
  zEmail,
  zOptDate,
  zOptText,
  zPassword,
  zText,
} from "@/lib/server-actions";

type Ctx = Extract<Awaited<ReturnType<typeof teacherContext>>, { ok: true }>;

const classSchema = z.object({
  name: zText(120),
  level: zOptText(80),
  academic_year: z.string().trim().regex(/^\d{4}-\d{4}$/, "year"),
  description: zOptText(1000),
  monthly_fee: z
    .union([z.literal(""), z.coerce.number({ message: "invalidField" }).min(0, "invalidField").max(9_999_999, "invalidField")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

function serviceOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

/** Classe de l'enseignant connecté (la RLS ne renvoie que les siennes). */
async function ownClass(ctx: Ctx, id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { data } = await ctx.supabase
    .from("classes")
    .select("id, school_id")
    .eq("id", id)
    .eq("teacher_id", ctx.userId)
    .maybeSingle();
  return data as { id: string; school_id: string | null } | null;
}

/** Élève inscrit dans au moins une classe de l'enseignant (filtré par la RLS). */
async function ownStudent(ctx: Ctx, id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { data } = await ctx.supabase.from("profiles").select("id").eq("id", id).eq("role", "student").maybeSingle();
  return data as { id: string } | null;
}

function refreshClass(classId: string) {
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/students");
  revalidatePath("/teacher");
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------
export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(classSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { data, error } = await ctx.supabase
    .from("classes")
    .insert({ ...parsed.data, teacher_id: ctx.userId, school_id: ctx.schoolId })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[teacher.createClass]", error?.code, error?.message);
    return fail(ctx.t, "generic", formData);
  }

  await ctx.log("class.create", "classes", data.id, { name: parsed.data.name });
  revalidatePath("/teacher/classes");
  return { ok: true, redirectTo: `/teacher/classes/${data.id}?ok=created` };
}

export async function updateClass(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await ownClass(ctx, id))) return fail(ctx.t, "forbidden");
  const parsed = parseForm(classSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const { error } = await ctx.supabase.from("classes").update(parsed.data).eq("id", id).eq("teacher_id", ctx.userId);
  if (error) return fail(ctx.t, "generic", formData);

  await ctx.log("class.update", "classes", id, { name: parsed.data.name });
  refreshClass(id);
  return { ok: true, message: ctx.t.teacher.classes.updatedOk };
}

export async function deleteClass(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = String(formData.get("id") ?? "");
  if (!(await ownClass(ctx, id))) return;

  const { error } = await ctx.supabase.from("classes").delete().eq("id", id).eq("teacher_id", ctx.userId);
  if (error) throw new Error(error.message);

  await ctx.log("class.delete", "classes", id);
  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/students");
  redirect("/teacher/classes");
}

// ---------------------------------------------------------------------------
// Élèves
// ---------------------------------------------------------------------------
const newStudentSchema = z.object({
  full_name: zText(120),
  email: zEmail,
  password: zPassword,
  student_code: zOptText(40),
  level: zOptText(80),
  birth_date: zOptDate,
  guardian_phone: zOptText(40),
});

/** Crée le compte d'un élève et l'inscrit directement dans une classe de l'enseignant. */
export async function createStudentInClass(classId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const klass = await ownClass(ctx, classId);
  if (!klass) return fail(ctx.t, "forbidden");

  const parsed = parseForm(newStudentSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;
  const data = parsed.data;

  const service = serviceOrNull();
  if (!service) return fail(ctx.t, "serviceKey", formData);

  const { data: created, error } = await service.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: "student" },
    user_metadata: { full_name: data.full_name },
  });
  if (error || !created.user) {
    console.error("[teacher.createStudent] auth.admin.createUser", error?.status, error?.code, error?.message);
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
      role: "student",
      full_name: data.full_name,
      school_id: klass.school_id ?? ctx.schoolId,
      locale: settings?.default_locale === "ar" ? "ar" : "fr",
    })
    .eq("id", uid);
  if (profileError) {
    console.error("[teacher.createStudent] profiles.update", profileError.code, profileError.message);
    return rollback("generic");
  }

  await service.from("teachers").delete().eq("id", uid);
  const { error: studentError } = await service.from("students").upsert({
    id: uid,
    student_code: data.student_code,
    level: data.level,
    birth_date: data.birth_date,
    guardian_phone: data.guardian_phone,
  });
  if (studentError) {
    console.error("[teacher.createStudent] students.upsert", studentError.code, studentError.message);
    return rollback(isUniqueViolation(studentError) ? "codeTaken" : "generic", "student_code");
  }

  const { error: enrollError } = await ctx.supabase.from("enrollments").insert({ class_id: classId, student_id: uid });
  if (enrollError) {
    console.error("[teacher.createStudent] enrollments.insert", enrollError.code, enrollError.message);
    return rollback("generic");
  }

  await ctx.log("student.create", "profiles", uid, { email: data.email, class_id: classId });
  refreshClass(classId);
  return { ok: true, message: ctx.t.teacher.classes.studentCreatedOk };
}

/** Inscrit un élève qui a déjà un compte, retrouvé par son adresse e-mail. */
export async function enrollByEmail(classId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await ownClass(ctx, classId))) return fail(ctx.t, "forbidden");

  const parsed = parseForm(z.object({ email: zEmail }), formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const service = serviceOrNull();
  if (!service) return fail(ctx.t, "serviceKey", formData);

  // L'enseignant ne voit pas encore cet élève (RLS) : recherche avec la clé service, limitée à l'e-mail exact.
  const { data: target } = await service
    .from("profiles")
    .select("id, role")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (!target) return fail(ctx.t, "studentNotFound", formData, "email");
  if (target.role !== "student") return fail(ctx.t, "notAStudent", formData, "email");

  return enroll(ctx, classId, target.id as string, formData);
}

/** Inscrit dans une classe un élève déjà présent dans une autre classe de l'enseignant. */
export async function enrollMyStudent(classId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await ownClass(ctx, classId))) return fail(ctx.t, "forbidden");
  const studentId = String(formData.get("student_id") ?? "");
  if (!(await ownStudent(ctx, studentId))) return fail(ctx.t, "required", undefined, "student_id");
  return enroll(ctx, classId, studentId);
}

async function enroll(ctx: Ctx, classId: string, studentId: string, formData?: FormData): Promise<ActionState> {
  const { error } = await ctx.supabase.from("enrollments").insert({ class_id: classId, student_id: studentId });
  if (error) {
    if (isUniqueViolation(error)) return fail(ctx.t, "alreadyEnrolled", formData, formData ? "email" : "student_id");
    console.error("[teacher.enroll]", error.code, error.message);
    return fail(ctx.t, "generic", formData);
  }
  await ctx.log("enrollment.create", "enrollments", classId, { student_id: studentId });
  refreshClass(classId);
  return { ok: true, message: ctx.t.teacher.classes.enrolledOk };
}

export async function unenrollStudent(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!(await ownClass(ctx, classId)) || !z.string().uuid().safeParse(studentId).success) return;

  const { error } = await ctx.supabase.from("enrollments").delete().eq("class_id", classId).eq("student_id", studentId);
  if (error) throw new Error(error.message);

  await ctx.log("enrollment.delete", "enrollments", classId, { student_id: studentId });
  refreshClass(classId);
}

/** Nouveau mot de passe pour un élève de l'enseignant. */
export async function resetStudentPassword(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  if (!(await ownStudent(ctx, studentId))) return fail(ctx.t, "forbidden");

  const parsed = parseForm(z.object({ password: zPassword }), formData, ctx.t);
  if (parsed.fail) return parsed.fail;

  const service = serviceOrNull();
  if (!service) return fail(ctx.t, "serviceKey");
  const { error } = await service.auth.admin.updateUserById(studentId, { password: parsed.data.password });
  if (error) return fail(ctx.t, "generic");

  await ctx.log("student.password_reset", "profiles", studentId);
  return { ok: true, message: ctx.t.admin.users.passwordUpdated };
}
