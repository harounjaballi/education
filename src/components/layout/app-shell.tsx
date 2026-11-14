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
 * Barre latérale en dégradé bleu (variables --brand / --brand-2 définies dans globals.css).
 */
const THEME = {
  aside: "bg-gradient-to-b from-brand to-brand-2 text-white border-transparent",
  brand: "text-white",
  logo: "bg-white text-brand shadow-sm",
  badge: "bg-white/15 text-white",
  footer: "border-white/15",
  user: "text-white",
  userSub: "text-white/70",
  initials: "bg-white/20 text-white",
  signOut: "text-white/80 hover:bg-white/10 hover:text-white",
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

  const brand = (
    <div className="flex items-center gap-3 px-2">
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
    <div className={`border-t pt-4 ${theme.footer}`}>
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
        className={`sticky top-0 hidden h-dvh flex-col gap-6 border-e px-4 py-5 lg:flex ${theme.aside}`}
      >
        {brand}
        <SidebarNav items={items} variant={variant} />
        {userBlock}
      </aside>

      <div className="flex min-w-0 flex-col bg-gradient-to-b from-brand-soft via-surface to-surface bg-[length:100%_360px] bg-no-repeat">
        {/* En-tête (mobile + actions) */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/60 bg-white/70 px-4 backdrop-blur sm:px-6">
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

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
