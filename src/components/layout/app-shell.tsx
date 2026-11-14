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

const THEMES = {
  admin: {
    aside: "bg-navy-950 text-navy-100 border-navy-900",
    brand: "text-white",
    logo: "bg-teal-500 text-white",
    badge: "bg-white/10 text-teal-200",
    footer: "border-white/10",
    user: "text-white",
    userSub: "text-navy-300",
    signOut: "text-navy-200 hover:bg-white/10 hover:text-white",
  },
  teacher: {
    aside: "bg-white text-slate-600 border-slate-200",
    brand: "text-navy-900",
    logo: "bg-navy-900 text-white",
    badge: "bg-teal-50 text-teal-700",
    footer: "border-slate-200",
    user: "text-navy-900",
    userSub: "text-slate-500",
    signOut: "text-slate-600 hover:bg-slate-100 hover:text-navy-900",
  },
  student: {
    aside:
      "bg-gradient-to-b from-teal-50/80 to-white text-slate-600 border-teal-100",
    brand: "text-navy-900",
    logo: "bg-teal-500 text-white",
    badge: "bg-white text-teal-700 ring-1 ring-teal-200",
    footer: "border-teal-100",
    user: "text-navy-900",
    userSub: "text-slate-500",
    signOut: "text-slate-600 hover:bg-white hover:text-navy-900",
  },
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
  const theme = THEMES[variant];
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
          className={`truncate text-[15px] font-semibold tracking-tight ${theme.brand}`}
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
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-500/15 text-sm font-semibold text-teal-700">
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
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

      <div className="flex min-w-0 flex-col">
        {/* En-tête (mobile + actions) */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
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
