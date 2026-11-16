import { GraduationCap, BookOpen, Video, ShieldCheck, Sparkles, Info } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { t } = await getDictionary();
  const { next, error } = await searchParams;

  const features = [
    // Une couleur par espace : lagon (enseignant), abricot (élève), indigo (administration).
    {
      icon: BookOpen,
      tile: "from-[#22D3EE] to-[#1D4ED8]",
      glow: "group-hover:shadow-[0_0_40px_-8px_#22D3EE]",
      fr: "Cours, documents et vidéos structurés",
    },
    {
      icon: Video,
      tile: "from-[#FB923C] to-[#C2255C]",
      glow: "group-hover:shadow-[0_0_40px_-8px_#FB923C]",
      fr: "Classes virtuelles en direct",
    },
    {
      icon: ShieldCheck,
      tile: "from-[#818CF8] to-[#7C3AED]",
      glow: "group-hover:shadow-[0_0_40px_-8px_#818CF8]",
      fr: "Données isolées et sécurisées",
    },
  ];

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* ───────────── Panneau de marque ───────────── */}
      <section className="relative hidden overflow-hidden bg-[#070B1A] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        {/* Aurores */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -start-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#4F46E5]/40 blur-[120px]" />
          <div className="absolute -end-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-[#0E7490]/40 blur-[110px]" />
          <div className="absolute -bottom-48 start-1/4 h-[28rem] w-[28rem] rounded-full bg-[#D9480F]/25 blur-[120px]" />
        </div>
        {/* Grille fine, fondue sur les bords */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 100%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#0E7490] shadow-[0_8px_30px_-6px_rgba(99,102,241,0.8)] ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">{t.app.name}</span>
        </div>

        {/* Accroche */}
        <div className="relative max-w-lg space-y-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" aria-hidden />
              La plateforme d'enseignement en ligne
            </span>
            <h1 className="bg-gradient-to-br from-white via-white to-white/50 bg-clip-text font-display text-5xl font-bold leading-[1.08] tracking-tight text-transparent text-balance xl:text-6xl">
              {t.app.tagline}
            </h1>
          </div>

          <ul className="space-y-3">
            {features.map(({ icon: Icon, tile, glow, fr }) => (
              <li
                key={fr}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 pe-5 backdrop-blur-md transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-white/20 transition duration-300 ${tile} ${glow}`}
                >
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </span>
                <span className="text-[15px] font-medium text-white/90">{fr}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-sm text-white/40">
          <span>
            © {new Date().getFullYear()} {t.app.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Connexion sécurisée
          </span>
        </div>
      </section>

      {/* ───────────── Formulaire ───────────── */}
      <section className="relative flex flex-col overflow-hidden px-5 py-6 sm:px-10">
        {/* Halo discret */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 start-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#6366F1]/15 via-[#22D3EE]/15 to-[#FB923C]/10 blur-3xl"
        />

        <div className="relative flex items-center lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#0E7490] text-white shadow-[0_6px_20px_-6px_rgba(99,102,241,0.8)]">
              <GraduationCap className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-navy-950">{t.app.name}</span>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 animate-fade-up">
          <div className="mb-9">
            <h2 className="font-display text-[2.5rem] font-bold leading-tight tracking-tight text-navy-950">
              {t.auth.title}
            </h2>
            <p className="mt-2 text-[15px] text-slate-500">{t.auth.subtitle}</p>
          </div>

          <LoginForm
            t={t.auth}
            next={next}
            initialError={error === "inactive" ? "inactive" : undefined}
          />

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 text-[13px] leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4F46E5]" aria-hidden />
            <p>{t.auth.noAccount}</p>
          </div>
        </div>

        <p className="relative text-center text-xs text-slate-400 lg:hidden">
          © {new Date().getFullYear()} {t.app.name}
        </p>
      </section>
    </main>
  );
}
