import Link from "next/link";
import { Send } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary, formatDate } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/page";
import { Form, SubmitButton, TextareaField } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/stat-card";
import { sendMessage } from "@/lib/messages-actions";
import { AutoRefresh } from "./auto-refresh";

type Msg = { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string };
type Contact = { id: string; full_name: string; email: string };

/**
 * Messagerie partagée enseignant / élève.
 * Contacts = personnes liées par une classe (filtrées par la RLS sur profiles).
 */
export async function Inbox({ space, withId }: { space: "teacher" | "student"; withId?: string }) {
  const supabase = await createClient();
  const me = (await getCurrentProfile())!;
  const { t, locale } = await getDictionary();
  const m = t.messages;
  const base = `/${space}/messages`;

  const [contactsRes, messagesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", space === "teacher" ? "student" : "teacher")
      .neq("id", me.id)
      .order("full_name")
      .limit(1000),
    supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const contacts = (contactsRes.data ?? []) as Contact[];
  const messages = (messagesRes.data ?? []) as Msg[];

  // Dernier message et non-lus par interlocuteur.
  const summary = new Map<string, { last?: Msg; unread: number }>();
  for (const msg of messages) {
    const other = msg.sender_id === me.id ? msg.recipient_id : msg.sender_id;
    const s = summary.get(other) ?? { unread: 0 };
    if (!s.last) s.last = msg;
    if (msg.recipient_id === me.id && !msg.read_at) s.unread += 1;
    summary.set(other, s);
  }
  const sorted = [...contacts].sort((a, b) => {
    const la = summary.get(a.id)?.last?.created_at ?? "";
    const lb = summary.get(b.id)?.last?.created_at ?? "";
    if (la !== lb) return lb.localeCompare(la);
    return (a.full_name || a.email).localeCompare(b.full_name || b.email);
  });

  const current = withId ? contacts.find((c) => c.id === withId) : undefined;
  let thread: Msg[] = [];
  if (current) {
    thread = messages
      .filter((msg) => msg.sender_id === current.id || msg.recipient_id === current.id)
      .slice(0, 200)
      .reverse();
    if (summary.get(current.id)?.unread) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", current.id)
        .eq("recipient_id", me.id)
        .is("read_at", null);
    }
  }

  return (
    <>
      <PageHeader title={m.title} subtitle={space === "teacher" ? m.teacherSubtitle : m.studentSubtitle} />
      <AutoRefresh />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className={clsx("card h-fit overflow-hidden", current && "hidden lg:block")}>
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-900">{m.contacts}</h2>
          {sorted.length === 0 ? (
            <div className="p-4">
              <EmptyState text={space === "teacher" ? m.noContactsTeacher : m.noContactsStudent} />
            </div>
          ) : (
            <ul className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto">
              {sorted.map((c) => {
                const s = summary.get(c.id);
                const active = c.id === current?.id;
                return (
                  <li key={c.id}>
                    <Link
                      href={`${base}?with=${c.id}`}
                      className={clsx("flex items-center gap-3 px-4 py-3 text-sm transition", active ? "bg-teal-50" : "hover:bg-slate-50")}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-50 text-xs font-semibold text-navy-700">
                        {(c.full_name || c.email).slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-navy-900">{c.full_name || c.email}</span>
                        {s?.last && (
                          <span className="block truncate text-xs text-slate-500">
                            {s.last.sender_id === me.id ? `${m.you} : ` : ""}
                            {s.last.body}
                          </span>
                        )}
                      </span>
                      {!!s?.unread && !active && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-600 px-1.5 text-[11px] font-semibold text-white">
                          {s.unread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className={clsx("card flex min-h-[60vh] flex-col overflow-hidden", !current && "hidden lg:flex")}>
          {!current ? (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState text={m.choose} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <Link href={base} className="text-sm text-slate-500 hover:text-navy-900 lg:hidden" aria-label={t.common.back}>
                  ←
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{current.full_name || current.email}</p>
                  <p className="truncate text-xs text-slate-500" dir="ltr">
                    {current.email}
                  </p>
                </div>
              </div>

              {/* flex-col-reverse : la conversation reste calée sur le dernier message. */}
              <div className="flex max-h-[55vh] flex-1 flex-col-reverse overflow-y-auto px-4 py-4">
                <div className="space-y-2">
                  {thread.length === 0 && <EmptyState text={m.empty} />}
                  {thread.map((msg) => {
                    const mine = msg.sender_id === me.id;
                    return (
                      <div key={msg.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={clsx(
                            "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                            mine ? "rounded-ee-md bg-navy-900 text-white" : "rounded-es-md bg-slate-100 text-navy-900",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          <p className={clsx("mt-1 text-[11px]", mine ? "text-navy-200" : "text-slate-500")}>
                            {formatDate(msg.created_at, locale, true)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 p-3">
                <Form action={sendMessage.bind(null, current.id)} resetOnSuccess>
                  <div className="flex items-end gap-2">
                    <TextareaField label={m.placeholder} name="body" rows={2} required className="flex-1 [&_label]:sr-only" />
                    <SubmitButton pendingLabel="…" className="shrink-0">
                      <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                      <span className="hidden sm:inline">{m.send}</span>
                    </SubmitButton>
                  </div>
                </Form>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
