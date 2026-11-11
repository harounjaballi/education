import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/types";

/** Aiguillage : chaque rôle est envoyé vers son espace. */
export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/auth/signout?reason=inactive");
  redirect(ROLE_HOME[profile.role]);
}
