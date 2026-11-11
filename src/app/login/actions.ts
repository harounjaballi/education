"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: "invalid" | "credentials" | "inactive" | "unknown"; email?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(6).max(128),
  next: z.string().optional(),
});

/** N'accepte que des chemins internes vers les espaces privés (anti open-redirect). */
function safeNext(next?: string) {
  if (!next) return "/";
  return /^\/(admin|teacher|student)(\/[\w\-/]*)?$/.test(next) ? next : "/";
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "invalid", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return { error: error?.status === 400 ? "credentials" : "unknown", email };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "inactive", email };
  }

  await supabase.rpc("log_action", { p_action: "auth.sign_in", p_entity: "profiles", p_entity_id: data.user.id });

  redirect(safeNext(parsed.data.next));
}
