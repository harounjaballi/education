"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "./server";

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale") === "ar" ? "ar" : "fr";
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Mémorise la préférence sur le profil si l'utilisateur est connecté (RLS : sa propre ligne).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ locale }).eq("id", user.id);

  revalidatePath("/", "layout");
}
