import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { Badge, EmptyRow, PageHeader, Table } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/form";
import { StatCard } from "@/components/ui/stat-card";
import { Banknote, Wallet } from "lucide-react";
import {
  currentMonth,
  formatMoney,
  formatMonth,
  isMonth,
  periodOf,
} from "@/lib/money";
import { getCurrency, one } from "@/app/admin/_data";
import { deletePayment } from "./actions";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Paiements" };

type ClassRef = { id: string; name: string; monthly_fee: number | null };
type StudentRow = {
  id: string;
  full_name: string;
  email: string;
  student: { enrollments: { class: ClassRef | ClassRef[] | null }[] } | null;
};
type Payment = {
  id: string;
  student_id: string;
  amount: number;
  paid_at: string;
  method: "cash" | "transfer" | "card" | "other";
  note: string | null;
};

export default async function TeacherPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : currentMonth();
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const p = t.teacher.payments;

  const [studentsRes, paymentsRes, currency] = await Promise.all([
    // RLS : élèves de ses classes ; seules ses propres inscriptions sont renvoyées.
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, student:students(enrollments(class:classes(id, name, monthly_fee)))",
      )
      .eq("role", "student")
      .order("full_name")
      .limit(1000),
    supabase
      .from("payments")
      .select("id, student_id, amount, paid_at, method, note")
      .eq("teacher_id", profile.id)
      .eq("period", periodOf(month))
      .order("paid_at", { ascending: false }),
    getCurrency(),
  ]);
  const students = must(studentsRes) as unknown as StudentRow[];
  const payments = (must(paymentsRes) as Payment[]).map((x) => ({
    ...x,
    amount: Number(x.amount),
  }));
  const money = (n: number) => formatMoney(n, currency, locale);

  const rows = students.map((s) => {
    const classes = (one(s.student)?.enrollments ?? [])
      .map((e) => one(e.class))
      .filter((c): c is ClassRef => !!c);
    const due = classes.reduce((sum, c) => sum + Number(c.monthly_fee ?? 0), 0);
    const paid = payments
      .filter((x) => x.student_id === s.id)
      .reduce((sum, x) => sum + x.amount, 0);
    const remaining = Math.max(0, due - paid);
    const status: "paid" | "partial" | "unpaid" | "none" =
      due === 0
        ? paid > 0
          ? "paid"
          : "none"
        : paid >= due
          ? "paid"
          : paid > 0
            ? "partial"
            : "unpaid";
    return { s, classes, due, paid, remaining, status };
  });
  const totalPaid = payments.reduce((sum, x) => sum + x.amount, 0);
  const totalRemaining = rows.reduce((sum, r) => sum + r.remaining, 0);
  const nameOf = new Map(students.map((s) => [s.id, s.full_name || s.email]));

  const statusBadge = {
    paid: <Badge tone="teal">{p.statusPaid}</Badge>,
    partial: <Badge tone="amber">{p.statusPartial}</Badge>,
    unpaid: <Badge tone="red">{p.statusUnpaid}</Badge>,
    none: <span className="text-slate-400">{p.statusNone}</span>,
  };

  return (
    <>
      <PageHeader title={p.title} subtitle={p.subtitle} />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <label className="space-y-1.5">
          <span className="label">{p.month}</span>
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="input"
            dir="ltr"
          />
        </label>
        <button type="submit" className="btn-secondary">
          {p.show}
        </button>
        <span className="ms-auto text-sm font-medium capitalize text-slate-600">
          {formatMonth(periodOf(month), locale)}
        </span>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label={p.totalPaid}
          value={money(totalPaid)}
          icon={Banknote}
          tone="teal"
        />
        <StatCard
          label={p.totalRemaining}
          value={money(totalRemaining)}
          icon={Wallet}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Table
            head={[p.student, p.due, p.paid, p.remaining, p.status]}
            minWidth={620}
          >
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} text={p.noStudents} />
            ) : (
              rows.map(({ s, classes, due, paid, remaining, status }) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/teacher/students/${s.id}`} className="link">
                      {s.full_name || s.email}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {classes.map((c) => c.name).join(", ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {due ? money(due) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {paid ? money(paid) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-navy-900">
                    {remaining ? money(remaining) : "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge[status]}</td>
                </tr>
              ))
            )}
          </Table>
          <p className="text-xs text-slate-500">{p.dueHelp}</p>

          <section className="card p-5">
            <h2 className="section-title mb-3">{p.history}</h2>
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
                      <p className="truncate font-medium text-navy-900">
                        {nameOf.get(x.student_id) ?? "—"}
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

        {students.length > 0 && (
          <section className="card h-fit p-5">
            <h2 className="section-title mb-4">{p.add}</h2>
            <PaymentForm
              t={p}
              saving={t.common.saving}
              month={month}
              students={students.map((s) => ({
                value: s.id,
                label: s.full_name || s.email,
              }))}
            />
          </section>
        )}
      </div>
    </>
  );
}
