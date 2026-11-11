export type Role = "super_admin" | "teacher" | "student";
export type AccountStatus = "active" | "suspended" | "disabled";
export type Locale = "fr" | "ar";

export interface Profile {
  id: string;
  role: Role;
  status: AccountStatus;
  full_name: string;
  email: string;
  avatar_url: string | null;
  locale: Locale;
  school_id: string | null;
}

export const ROLE_HOME: Record<Role, string> = {
  super_admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};
