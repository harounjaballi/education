"use client";
import { useActionState } from "react";
import { Loader2, LogIn, AlertCircle } from "lucide-react";
import { signIn, type LoginState } from "./actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

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

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{t.errors[state.error]}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="label">
          {t.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="input"
          dir="ltr"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="label">
          {t.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="input"
          dir="ltr"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
