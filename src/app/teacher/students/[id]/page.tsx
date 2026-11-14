import Link from "next/link";
import { MessageSquare, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { Badge, PageHeader, STATUS_TONE } from "@/components/ui/page";
import { ConfirmForm, Field, Form, SubmitButton } from "@/components/ui/form";
import { getCurrentProfile } from "@/lib/auth";
import {
  currentMonth,
  formatMoney,
  formatMonth,
  isOnline,
  periodOf,
} from "@/lib/money";
import { deletePayment } from "../../payments/actions";
import { PaymentForm } from "../../payments/payment-form";
import type { AccountStatus } from "@/lib/types";
import { getCurrency, one } from "@/app/admin/_data";
import { resetStudentPassword } from "../../actions";

type ClassRef = {
  id: string;
  name: string;
  academic_year: string;
  monthly_fee: number | null;
};
type Payment = {
  id: string;
  period: string;
  amount: number;
  paid_at: string;
  method: "cash" | "transfer" | "card" | "other";
  note: string | null;
};
type Student = {
  id: string;
  full_name: string;
  email: string;
  status: AccountStatus;
  last_seen_at: string | null;
  student: {
    student_code: string | null;
    level: string | null;
    birth_date: string | null;
    guardian_phone: string | null;
    enrollments: { enrolled_at: string; class: ClassRef | ClassRef[] | null }[];
  } | null;
};

export default async function TeacherStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { t, locale } = await getDictionary();
  const s = t.teacher.students;
  const u = t.admin.users;

  const me = (await getCurrentProfile())!;
  const p = t.teacher.payments;
  const [{ data }, paymentsRes, currency] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, status, last_seen_at, student:students(student_code, level, birth_date, guardian_phone, enrollments(enrolled_at, class:classes(id, name, academic_year, monthly_fee)))",
      )
      .eq("id", id)
      .eq("role", "student")
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, period, amount, paid_at, method, note")
      .eq("student_id", id)
      .eq("teacher_id", me.id)
      .order("period", { ascending: false })
      .order("paid_at", { ascending: false }),
    getCurrency(),
  ]);
  if (!data) notFound();

  const user = data as unknown as Student;
  const student = one(user.student);
  const enrollments = (student?.enrollments ?? [])
    .map((e) => ({ at: e.enrolled_at, klass: one(e.class) }))
    .filter((e): e is { at: string; klass: ClassRef } => !!e.klass);

  const payments = ((paymentsRes.data ?? []) as Payment[]).map((x) => ({
    ...x,
    amount: Number(x.amount),
  }));
  const month = currentMonth();
  const due = enrollments.reduce(
    (sum, e) => sum + Number(e.klass.monthly_fee ?? 0),
    0,
  );
  const paidThisMonth = payments
    .filter((x) => x.period === periodOf(month))
    .reduce((sum, x) => sum + x.amount, 0);
  const remaining = Math.max(0, due - paidThisMonth);
  const money = (n: number) => formatMoney(n, currency, locale);
  const online = isOnline(user.last_seen_at);

  const info: [string, string | null | undefined, boolean?][] = [
    [
      s.presence,
      online
        ? s.online
        : user.last_seen_at
          ? `${s.lastSeen} ${formatDate(user.last_seen_at, locale, true)}`
          : s.never,
    ],
    [u.email, user.email, true],
    [u.studentCode, student?.student_code, true],
    [u.level, student?.level],
    [
      u.birthDate,
      student?.birth_date ? formatDate(student.birth_date, locale) : null,
    ],
    [u.guardianPhone, student?.guardian_phone, true],
  ];

  return (
    <>
      <PageHeader
        title={user.full_name || user.email}
        subtitle={t.roles.student}
        back={{ href: "/teacher/students", label: s.title }}
        actions={
          <>
            <Badge tone={STATUS_TONE[user.status]}>
              {t.admin.status[user.status]}
            </Badge>
            <Link
              href={`/teacher/messages?with=${user.id}`}
              className="btn-secondary"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              {t.messages.send}
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{u.profileSection}</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {info.map(([label, value, ltr]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd
                    className="mt-0.5 text-navy-900"
                    dir={ltr ? "ltr" : undefined}
                  >
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-4">{s.classes}</h2>
            <ul className="divide-y divide-slate-100">
              {enrollments.map((e) => (
                <li
                  key={e.klass.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <Link
                    href={`/teacher/classes/${e.klass.id}`}
                    className="link"
                  >
                    {e.klass.name}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {s.enrolledOn} {formatDate(e.at, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="section-title mb-1">{p.history}</h2>
            <p className="mb-4 text-xs text-slate-500">
              <span className="capitalize">
                {formatMonth(periodOf(month), locale)}
              </span>{" "}
              · {p.due} {due ? money(due) : "—"} · {p.paid}{" "}
              {money(paidThisMonth)} · {p.remaining} {money(remaining)}
            </p>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">{p.empty}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {payments.map((x) => (
                  <li
                    key={x.id}
                    className="flex items-center gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium capitalize text-navy-900">
                        {formatMonth(x.period, locale)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(x.paid_at, locale)} · {p.methods[x.method]}
                        {x.note ? ` · ${x.note}` : ""}
                      </p>
                    </div>
                    <span className="tabular-nums font-medium">
                      {money(x.amount)}
                    </span>
                    <ConfirmForm
                      action={deletePayment}
                      confirmMessage={p.deleteConfirm}
                    >
                      <input type="hidden" name="id" value={x.id} />
                      <button
                        type="submit"
                        className="btn-ghost-danger"
                        aria-label={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </ConfirmForm>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card h-fit p-5">
            <h2 className="section-title mb-4">{p.add}</h2>
            <PaymentForm
              t={p}
              saving={t.common.saving}
              studentId={user.id}
              month={month}
              amount={remaining || undefined}
            />
          </section>

          <section className="card h-fit p-5">
            <h2 className="section-title mb-1">{s.passwordSection}</h2>
            <p className="mb-4 text-xs text-slate-500">{s.passwordHelp}</p>
            <Form
              action={resetStudentPassword.bind(null, user.id)}
              resetOnSuccess
            >
              <Field
                label={u.newPassword}
                name="password"
                type="password"
                required
                dir="ltr"
                hint={u.passwordHint}
                autoComplete="new-password"
              />
              <SubmitButton
                variant="secondary"
                pendingLabel={t.common.saving}
                className="w-full"
              >
                {t.common.save}
              </SubmitButton>
            </Form>
          </section>
        </div>
      </div>
    </>
  );
}
