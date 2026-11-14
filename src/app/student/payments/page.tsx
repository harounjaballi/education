import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { must } from "@/lib/query";
import { EmptyRow, PageHeader, Table } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { Banknote } from "lucide-react";
import { formatMoney, formatMonth } from "@/lib/money";
import { getCurrency, one } from "@/app/admin/_data";

export const metadata = { title: "Mes paiements" };

type Row = {
  id: string;
  period: string;
  amount: number;
  paid_at: string;
  method: "cash" | "transfer" | "card" | "other";
  teacher: { profile: { full_name: string } | null } | null;
};

export default async function StudentPaymentsPage() {
  const supabase = await createClient();
  const profile = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const p = t.student.payments;

  // RLS : l'élève ne lit que ses propres paiements.
  const [res, currency] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, period, amount, paid_at, method, teacher:teachers(profile:profiles(full_name))",
      )
      .eq("student_id", profile.id)
      .order("period", { ascending: false })
      .order("paid_at", { ascending: false }),
    getCurrency(),
  ]);
  const rows = (must(res) as unknown as Row[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const money = (n: number) => formatMoney(n, currency, locale);

  return (
    <>
      <PageHeader title={p.title} subtitle={p.subtitle} />
      <div className="mb-6 max-w-sm">
        <StatCard
          label={p.total}
          value={money(total)}
          icon={Banknote}
          tone="teal"
        />
      </div>
      <Table
        head={[
          p.month,
          p.amount,
          p.paidAt,
          t.teacher.payments.method,
          p.teacher,
        ]}
        minWidth={620}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} text={p.empty} />
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium capitalize text-navy-900">
                {formatMonth(r.period, locale)}
              </td>
              <td className="px-4 py-3 tabular-nums">{money(r.amount)}</td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(r.paid_at, locale)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {t.teacher.payments.methods[r.method]}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {one(one(r.teacher)?.profile)?.full_name ?? "—"}
              </td>
            </tr>
          ))
        )}
      </Table>
    </>
  );
}
