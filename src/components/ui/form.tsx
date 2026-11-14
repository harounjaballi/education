"use client";
import { createContext, useActionState, useContext, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { ActionState, FormAction } from "@/lib/action-state";

const FormStateContext = createContext<ActionState>({});

/**
 * Formulaire lié à une Server Action. Affiche le message global et transmet
 * les erreurs par champ aux composants Field / SelectField / TextareaField.
 */
export function Form({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
    else if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess, router]);

  return (
    <FormStateContext.Provider value={state}>
      <form ref={ref} action={formAction} className={clsx("space-y-4", className)} noValidate>
        <FormAlert state={state} />
        {children}
      </form>
    </FormStateContext.Provider>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{state.error}</span>
      </div>
    );
  if (state.ok && state.message)
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-sm text-teal-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{state.message}</span>
      </div>
    );
  return null;
}

function useField(name: string, defaultValue?: string | null) {
  const state = useContext(FormStateContext);
  const id = useId();
  return {
    id,
    error: state.fieldErrors?.[name],
    value: state.values?.[name] ?? defaultValue ?? "",
    hasValues: !!state.values,
    values: state.values,
  };
}

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="label">
      {label}
      {required && (
        <span className="text-red-500" aria-hidden>
          {" "}
          *
        </span>
      )}
    </label>
  );
}

function Help({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={`${id}-msg`} className="text-xs text-red-600">
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={`${id}-msg`} className="text-xs text-slate-500">
        {hint}
      </p>
    );
  return null;
}

const errorRing = "border-red-400 focus:border-red-500 focus:ring-red-500/15";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  hint,
  dir,
  autoComplete,
  placeholder,
  className,
  list,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "tel" | "date" | "month" | "number" | "datetime-local" | "url";
  defaultValue?: string | null;
  required?: boolean;
  hint?: string;
  dir?: "ltr" | "rtl";
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  /** Identifiant d'un <datalist> de suggestions. */
  list?: string;
}) {
  const f = useField(name, defaultValue);
  return (
    <div className={clsx("space-y-1.5", className)}>
      <Label htmlFor={f.id} label={label} required={required} />
      <input
        list={list}
        id={f.id}
        name={name}
        type={type}
        defaultValue={type === "password" ? undefined : f.value}
        required={required}
        dir={dir}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={!!f.error}
        aria-describedby={f.error || hint ? `${f.id}-msg` : undefined}
        className={clsx("input", f.error && errorRing)}
      />
      <Help id={f.id} error={f.error} hint={hint} />
    </div>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  required,
  hint,
  rows = 3,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  const f = useField(name, defaultValue);
  return (
    <div className={clsx("space-y-1.5", className)}>
      <Label htmlFor={f.id} label={label} required={required} />
      <textarea
        id={f.id}
        name={name}
        rows={rows}
        defaultValue={f.value}
        required={required}
        aria-invalid={!!f.error}
        className={clsx("input resize-y", f.error && errorRing)}
      />
      <Help id={f.id} error={f.error} hint={hint} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required,
  hint,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  const f = useField(name, defaultValue);
  return (
    <div className={clsx("space-y-1.5", className)}>
      <Label htmlFor={f.id} label={label} required={required} />
      <select
        id={f.id}
        name={name}
        defaultValue={f.value}
        required={required}
        aria-invalid={!!f.error}
        className={clsx("input pe-9", f.error && errorRing)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Help id={f.id} error={f.error} hint={hint} />
    </div>
  );
}

export function CheckboxField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  const f = useField(name);
  const checked = f.hasValues ? f.values?.[name] === "on" : !!defaultChecked;
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-900">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
      {label}
    </label>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
  }[variant];
  return (
    <button type="submit" disabled={pending} className={clsx(styles, className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/**
 * Formulaire d'action simple (suppression, retrait…) avec confirmation navigateur.
 * L'action reçoit le FormData ; les champs cachés portent les identifiants.
 */
export function ConfirmForm({
  action,
  confirmMessage,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
