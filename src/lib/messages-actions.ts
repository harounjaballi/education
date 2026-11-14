"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { fail } from "@/lib/server-actions";

/**
 * Envoi d'un message. La RLS (messages_send) n'autorise l'envoi qu'entre
 * un enseignant et un élève liés par une classe.
 */
export async function sendMessage(recipientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !z.string().uuid().safeParse(recipientId).success) return fail(t, "forbidden");

  const { data: me } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!me || me.status !== "active" || (me.role !== "teacher" && me.role !== "student")) return fail(t, "forbidden");

  const body = z.string().trim().min(1, "required").max(5000, "tooLong").safeParse(formData.get("body"));
  if (!body.success) return fail(t, body.error.issues[0]?.message === "tooLong" ? "tooLong" : "required", formData, "body");

  const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: recipientId, body: body.data });
  if (error) {
    console.error("[sendMessage]", error.code, error.message);
    return fail(t, error.code === "42501" ? "forbidden" : "generic", formData);
  }

  revalidatePath(me.role === "teacher" ? "/teacher/messages" : "/student/messages");
  return { ok: true };
}
