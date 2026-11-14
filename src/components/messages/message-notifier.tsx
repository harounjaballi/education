"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Toast = { id: string; senderId: string; sender: string; body: string };
type Row = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender:
    | { full_name: string; email: string }
    | { full_name: string; email: string }[]
    | null;
};

/**
 * Petite fenêtre de notification à l'arrivée d'un nouveau message.
 * Vérifie toutes les 10 secondes les messages non lus reçus depuis l'ouverture de la page.
 */
export function MessageNotifier({
  userId,
  space,
  labels,
}: {
  userId: string;
  space: "teacher" | "student";
  labels: { title: string; open: string; close: string };
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const since = useRef(new Date().toISOString());
  const seen = useRef(new Set<string>());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Conversation ouverte : ses messages s'affichent déjà, pas de notification.
  const openWith =
    pathname === `/${space}/messages` ? searchParams.get("with") : null;
  const openWithRef = useRef(openWith);
  openWithRef.current = openWith;

  useEffect(() => {
    const supabase = createClient();
    let stopped = false;

    async function check() {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase
        .from("messages")
        .select(
          "id, sender_id, body, created_at, sender:profiles!messages_sender_id_fkey(full_name, email)",
        )
        .eq("recipient_id", userId)
        .is("read_at", null)
        .gt("created_at", since.current)
        .order("created_at", { ascending: true })
        .limit(10);
      if (stopped || !data?.length) return;

      const fresh: Toast[] = [];
      for (const m of data as unknown as Row[]) {
        if (seen.current.has(m.id)) continue;
        seen.current.add(m.id);
        if (m.sender_id === openWithRef.current) continue;
        const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
        fresh.push({
          id: m.id,
          senderId: m.sender_id,
          sender: sender?.full_name || sender?.email || "",
          body: m.body,
        });
      }
      if (fresh.length) setToasts((prev) => [...prev, ...fresh].slice(-3));
    }

    const id = setInterval(check, 10_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [userId]);

  // Disparition automatique après 8 secondes.
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((prev) => prev.slice(1)), 8000);
    return () => clearTimeout(id);
  }, [toasts]);

  const close = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 end-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lift"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
            <MessageSquare className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-teal-700">{labels.title}</p>
            <p className="truncate text-sm font-semibold text-navy-900">
              {t.sender}
            </p>
            <p className="line-clamp-2 text-sm text-slate-600">{t.body}</p>
            <Link
              href={`/${space}/messages?with=${t.senderId}`}
              onClick={() => close(t.id)}
              className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              {labels.open}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => close(t.id)}
            className="h-7 w-7 shrink-0 rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={labels.close}
          >
            <X className="mx-auto h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
