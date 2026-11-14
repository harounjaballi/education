import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/types";

export type IconName = "dashboard" | "schools" | "teachers" | "students" | "classes" | "courses" | "messages" | "payments" | "feed" | "activity" | "settings";

export interface NavItem {
  href: string;
  label: keyof Dictionary["nav"];
  icon: IconName;
}

/**
 * Seules les pages réellement implémentées apparaissent ici.
 * Chaque phase ajoute ses entrées (cours, devoirs, examens, messagerie…).
 */
export const NAVIGATION: Record<Role, NavItem[]> = {
  super_admin: [
    { href: "/admin", label: "dashboard", icon: "dashboard" },
    { href: "/admin/schools", label: "schools", icon: "schools" },
    { href: "/admin/teachers", label: "teachers", icon: "teachers" },
    { href: "/admin/students", label: "students", icon: "students" },
    { href: "/admin/classes", label: "classes", icon: "classes" },
    { href: "/admin/activity", label: "activity", icon: "activity" },
    { href: "/admin/settings", label: "settings", icon: "settings" },
  ],
  teacher: [
    { href: "/teacher", label: "dashboard", icon: "dashboard" },
    { href: "/teacher/classes", label: "classes", icon: "classes" },
    { href: "/teacher/feed", label: "feed", icon: "feed" },
    { href: "/teacher/students", label: "students", icon: "students" },
    { href: "/teacher/courses", label: "courses", icon: "courses" },
    { href: "/teacher/messages", label: "messages", icon: "messages" },
    { href: "/teacher/payments", label: "payments", icon: "payments" },
  ],
  student: [
    { href: "/student", label: "dashboard", icon: "dashboard" },
    { href: "/student/feed", label: "feed", icon: "feed" },
    { href: "/student/courses", label: "courses", icon: "courses" },
    { href: "/student/messages", label: "messages", icon: "messages" },
    { href: "/student/payments", label: "payments", icon: "payments" },
  ],
};

/** Variante visuelle de chaque espace. */
export const SPACE_THEME: Record<Role, "admin" | "teacher" | "student"> = {
  super_admin: "admin",
  teacher: "teacher",
  student: "student",
};
