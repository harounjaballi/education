"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, Children } from "react";
import { LayoutDashboard, Menu, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { IconName } from "@/config/navigation";

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
};

type Variant = "admin" | "teacher" | "student";
type Item = { href: string; icon: IconName; labelText: string };

const LINK_STYLES: Record<Variant, { base: string; active: string }> = {
  admin: {
    base: "text-navy-200 hover:bg-white/5 hover:text-white",
    active: "bg-white/10 text-white",
  },
  teacher: {
    base: "text-slate-600 hover:bg-slate-100 hover:text-navy-900",
    active: "bg-navy-900 text-white shadow-sm",
  },
  student: {
    base: "text-slate-600 hover:bg-white hover:text-navy-900",
    active: "bg-white text-teal-700 shadow-card ring-1 ring-teal-100",
  },
};

function isActive(pathname: string, href: string) {
  const root = href.split("/").length === 2; // "/admin", "/teacher", "/student"
  return root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items, variant, onNavigate }: { items: Item[]; variant: Variant; onNavigate?: () => void }) {
  const pathname = usePathname();
  const styles = LINK_STYLES[variant];
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active ? styles.active : styles.base,
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {item.labelText}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tiroir de navigation pour mobile et tablette. children = [marque, bloc utilisateur]. */
export function MobileNav({
  items,
  variant,
  labels,
  asideClass,
  children,
}: {
  items: Item[];
  variant: Variant;
  labels: { menu: string; close: string };
  asideClass: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [brand, userBlock] = Children.toArray(children);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ms-1.5 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label={labels.menu}
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label={labels.close}
          />
          <aside
            className={clsx(
              "absolute inset-y-0 start-0 flex w-[84%] max-w-xs flex-col gap-6 border-e px-4 py-5 shadow-lift animate-fade-up",
              asideClass,
            )}
          >
            <div className="flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 opacity-70 hover:opacity-100"
                aria-label={labels.close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <SidebarNav items={items} variant={variant} onNavigate={() => setOpen(false)} />
            {userBlock}
          </aside>
        </div>
      )}
    </>
  );
}
