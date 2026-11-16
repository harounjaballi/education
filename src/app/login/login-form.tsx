"use client";
import { useActionState, useState } from "react";
import { Loader2, ArrowRight, AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signIn, type LoginState } from "./actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const field =
  "peer block h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 text-[15px] text-navy-950 " +
  "placeholder:text-slate-400 transition duration-200 hover:border-slate-300 " +
  "focus:border-[#6366F1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6366F1]/15";

const fieldIcon =
  "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition peer-focus:text-[#6366F1]";

export function LoginForm({
  t,
  next,
  initialError,
}: {
  t: Dictionary["auth"];
  next?: string;
  initialError?: LoginState["error"];
}) {
  const [state, action, pending] = useActionState(signIn, { error: initialError });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700 animate-fade-up"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{t.errors[state.error]}</span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-navy-900">
          {t.email}
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder="nom@exemple.com"
            className={`${field} pr-4`}
            dir="ltr"
          />
          <Mail className={fieldIcon} aria-hidden />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-navy-900">
          {t.password}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            className={`${field} pr-12`}
            dir="ltr"
          />
          <Lock className={fieldIcon} aria-hidden />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="group relative mt-2 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl
                   bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#0E7490] bg-[length:200%_100%] bg-left
                   px-5 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.8)]
                   transition-all duration-500 hover:bg-right hover:shadow-[0_14px_36px_-10px_rgba(79,70,229,0.9)]
                   active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
            {t.submitting}
          </>
        ) : (
          <>
            {t.submit}
            <ArrowRight
              className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </>
        )}
      </button>
    </form>
  );
}
