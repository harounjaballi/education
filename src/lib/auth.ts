import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Profile, type Role } from "@/lib/types";

/** Profil de l'utilisateur connecté (mis en cache pour la durée de la requête). */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, status, full_name, email, avatar_url, locale, school_id")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
});

/**
 * Garde serveur des espaces : redirige si non connecté, compte inactif
 * ou mauvais rôle. La RLS reste la barrière finale côté base.
 */
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/auth/signout?reason=inactive");
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);
  return profile;
}
