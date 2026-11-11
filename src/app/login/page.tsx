import { GraduationCap, BookOpen, Video, ShieldCheck } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { next, error } = await searchParams;

  const features = [
    { icon: BookOpen, fr: "Cours, documents et vidéos structurés", ar: "دروس ووثائق وفيديوهات منظّمة" },
    { icon: Video, fr: "Classes virtuelles en direct", ar: "أقسام افتراضية مباشرة" },
    { icon: ShieldCheck, fr: "Données isolées et sécurisées", ar: "بيانات معزولة ومؤمّنة" },
  ];

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panneau de marque */}
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -start-20 h-[28rem] w-[28rem] rounded-full bg-navy-500/30 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">{t.app.name}</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">{t.app.tagline}</h1>
          <ul className="space-y-4">
            {features.map(({ icon: Icon, fr, ar }) => (
              <li key={fr} className="flex items-center gap-3 text-navy-100">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-teal-300" aria-hidden />
                </span>
                {locale === "ar" ? ar : fr}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-navy-300">© {new Date().getFullYear()} {t.app.name}</p>
      </section>

      {/* Formulaire */}
      <section className="flex flex-col bg-surface px-5 py-8 sm:px-10">
        <div className="flex justify-end">
          <LocaleSwitcher locale={locale} />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-white">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight text-navy-900">{t.app.name}</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{t.auth.title}</h2>
          <p className="mb-8 mt-1.5 text-sm text-slate-500">{t.auth.subtitle}</p>
          <div className="card p-6 sm:p-7">
            <LoginForm t={t.auth} next={next} initialError={error === "inactive" ? "inactive" : undefined} />
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">{t.auth.noAccount}</p>
        </div>
      </section>
    </main>
  );
}
