import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/types";

export type IconName = "dashboard";

export interface NavItem {
  href: string;
  label: keyof Dictionary["nav"];
  icon: IconName;
}

/**
 * Seules les pages réellement implémentées apparaissent ici.
 * Chaque phase ajoute ses entrées (classes, cours, devoirs, examens, messagerie…).
 */
export const NAVIGATION: Record<Role, NavItem[]> = {
  super_admin: [{ href: "/admin", label: "dashboard", icon: "dashboard" }],
  teacher: [{ href: "/teacher", label: "dashboard", icon: "dashboard" }],
  student: [{ href: "/student", label: "dashboard", icon: "dashboard" }],
};

/** Variante visuelle de chaque espace. */
export const SPACE_THEME: Record<Role, "admin" | "teacher" | "student"> = {
  super_admin: "admin",
  teacher: "teacher",
  student: "student",
};
