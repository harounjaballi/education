import { GraduationCap, LogOut } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { NAVIGATION, SPACE_THEME } from "@/config/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Suspense } from "react";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { MessageNotifier } from "@/components/messages/message-notifier";
import { SidebarNav, MobileNav } from "./sidebar-nav";
import type { Profile } from "@/lib/types";

/**
 * Barre latérale sombre « aurore » (même style que la page de connexion) pour tous les espaces.
 * SIDEBAR_SPACE impose les variables --brand / --brand-2 de globals.css sur la barre.
 */
export const SIDEBAR_SPACE = "teacher";

const THEME = {
  aside: "overflow-hidden bg-[#070B1A] text-white border-white/5",
  brand: "text-white",
  logo: "bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#0E7490] text-white shadow-[0_8px_24px_-6px_rgba(99,102,241,0.8)] ring-1 ring-white/20",
  badge: "bg-white/10 text-white/80 ring-1 ring-white/10",
  footer: "border-white/10",
  user: "text-white",
  userSub: "text-white/50",
  initials: "bg-gradient-to-br from-[#FB923C] to-[#C2255C] text-white ring-2 ring-white/10",
  signOut: "text-white/60 hover:bg-white/[0.06] hover:text-white",
} as const;

export async function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const { t, locale } = await getDictionary();
  const variant = SPACE_THEME[profile.role];
  const theme = THEME;
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("platform_name")
    .maybeSingle();
  const platformName =
    (settings?.platform_name as string | undefined) || t.app.name;
  const items = NAVIGATION[profile.role].map((item) => ({
    ...item,
    labelText: t.nav[item.label],
  }));
  const initials =
    profile.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || profile.email[0]?.toUpperCase();

  const aurora = (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-[#4F46E5]/35 blur-[90px]" />
      <div className="absolute -bottom-24 -end-24 h-72 w-72 rounded-full bg-[#0E7490]/30 blur-[90px]" />
    </div>
  );

  const brand = (
    <div className="relative flex items-center gap-3 px-2">
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${theme.logo}`}
      >
        <GraduationCap className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p
          className={`truncate font-display text-base font-bold tracking-tight ${theme.brand}`}
        >
          {platformName}
        </p>
        <span
          className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${theme.badge}`}
        >
          {t.roles[profile.role]}
        </span>
      </div>
    </div>
  );

  const userBlock = (
    <div className={`relative border-t pt-4 ${theme.footer}`}>
      <div className="flex items-center gap-3 px-2">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${theme.initials}`}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${theme.user}`}>
            {profile.full_name || profile.email}
          </p>
          <p className={`truncate text-xs ${theme.userSub}`} dir="ltr">
            {profile.email}
          </p>
        </div>
      </div>
      <form action="/auth/signout" method="post" className="mt-3">
        <button
          type="submit"
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${theme.signOut}`}
        >
          <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {t.common.signOut}
        </button>
      </form>
    </div>
  );

  return (
    <div
      data-space={variant}
      className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]"
    >
      <PresenceHeartbeat />
      {(profile.role === "teacher" || profile.role === "student") && (
        <Suspense fallback={null}>
          <MessageNotifier
            userId={profile.id}
            space={profile.role}
            labels={{
              title: t.messages.newMessage,
              open: t.messages.open,
              close: t.common.close,
            }}
          />
        </Suspense>
      )}
      {/* Barre latérale (bureau) */}
      <aside
        data-space={SIDEBAR_SPACE}
        className={`sticky top-0 hidden h-dvh flex-col gap-7 border-e px-4 py-6 lg:flex ${theme.aside}`}
      >
        {aurora}
        {brand}
        <SidebarNav items={items} variant={variant} />
        {userBlock}
      </aside>

      <div className="relative flex min-w-0 flex-col bg-surface">
        {/* Halo discret en haut de page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_30%_0%,rgb(var(--brand)/0.12),transparent),radial-gradient(40%_80%_at_85%_0%,rgb(var(--brand-2)/0.10),transparent)]"
        />
        {/* En-tête (mobile + actions). Le flou est sur ::before : un backdrop-filter sur l'en-tête
            lui-même enfermerait le tiroir mobile (position: fixed) dans ses 64 px de haut. */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/60 px-4 before:absolute before:inset-0 before:-z-10 before:bg-white/60 before:backdrop-blur-xl sm:px-6">
          <MobileNav
            items={items}
            variant={variant}
            labels={{ menu: t.common.menu, close: t.common.close }}
            asideClass={theme.aside}
          >
            {brand}
            {userBlock}
          </MobileNav>
          <div className="flex-1" />
          <LocaleSwitcher locale={locale} />
        </header>

        <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-6 animate-fade-up sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
