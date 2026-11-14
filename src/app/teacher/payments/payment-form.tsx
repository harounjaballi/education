import { Field, Form, SelectField, SubmitButton } from "@/components/ui/form";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { addPayment } from "./actions";

type Option = { value: string; label: string };

/** Formulaire d'enregistrement d'un paiement (page Paiements et fiche élève). */
export function PaymentForm({
  t,
  saving,
  students,
  studentId,
  month,
  amount,
}: {
  t: Dictionary["teacher"]["payments"];
  saving: string;
  students?: Option[];
  studentId?: string;
  month: string;
  amount?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Form action={addPayment} resetOnSuccess>
      {students ? (
        <SelectField
          label={t.student}
          name="student_id"
          options={students}
          required
          placeholder="—"
        />
      ) : (
        <input type="hidden" name="student_id" value={studentId} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.month}
          name="month"
          type="month"
          required
          dir="ltr"
          defaultValue={month}
        />
        <Field
          label={t.amount}
          name="amount"
          type="number"
          required
          dir="ltr"
          defaultValue={amount ? String(amount) : undefined}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.paidAt}
          name="paid_at"
          type="date"
          required
          dir="ltr"
          defaultValue={today}
        />
        <SelectField
          label={t.method}
          name="method"
          defaultValue="cash"
          options={(["cash", "transfer", "card", "other"] as const).map(
            (m) => ({ value: m, label: t.methods[m] }),
          )}
        />
      </div>
      <Field label={t.note} name="note" />
      <SubmitButton pendingLabel={saving} className="w-full">
        {t.add}
      </SubmitButton>
    </Form>
  );
}
