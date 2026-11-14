"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import {
  fail,
  parseForm,
  teacherContext,
  zOptText,
} from "@/lib/server-actions";
import { periodOf } from "@/lib/money";

const paymentSchema = z.object({
  student_id: z.string().uuid("required"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "invalidField"),
  amount: z.coerce
    .number({ message: "invalidField" })
    .positive("invalidField")
    .max(9_999_999, "invalidField"),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidField"),
  method: z.enum(["cash", "transfer", "card", "other"], {
    message: "invalidField",
  }),
  note: zOptText(500),
});

function refresh(studentId: string) {
  revalidatePath("/teacher/payments");
  revalidatePath(`/teacher/students/${studentId}`);
  revalidatePath("/student/payments");
}

/** Enregistre un paiement. La RLS impose que l'élève soit inscrit dans une classe de l'enseignant. */
export async function addPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await teacherContext();
  if (!ctx.ok) return fail(ctx.t, "forbidden");
  const parsed = parseForm(paymentSchema, formData, ctx.t);
  if (parsed.fail) return parsed.fail;
  const { month, ...rest } = parsed.data;

  const { error } = await ctx.supabase
    .from("payments")
    .insert({ ...rest, period: periodOf(month), teacher_id: ctx.userId });
  if (error) {
    console.error("[addPayment]", error.code, error.message);
    return fail(
      ctx.t,
      error.code === "42501" ? "forbidden" : "generic",
      formData,
    );
  }

  await ctx.log("payment.create", "payments", null, {
    student_id: rest.student_id,
    month,
    amount: rest.amount,
  });
  refresh(rest.student_id);
  return { ok: true, message: ctx.t.teacher.payments.addedOk };
}

export async function deletePayment(formData: FormData) {
  const ctx = await teacherContext();
  if (!ctx.ok) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const { data } = await ctx.supabase
    .from("payments")
    .delete()
    .eq("id", id.data)
    .eq("teacher_id", ctx.userId)
    .select("student_id")
    .maybeSingle();
  if (!data) return;

  await ctx.log("payment.delete", "payments", id.data);
  refresh(data.student_id as string);
}
