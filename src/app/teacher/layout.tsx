import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("teacher");
  return <AppShell profile={profile}>{children}</AppShell>;
}
