import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("super_admin");
  return <AppShell profile={profile}>{children}</AppShell>;
}
