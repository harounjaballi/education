import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canJoin, jitsiUrl, type MeetingStatus } from "@/lib/meetings";
import type { Role } from "@/lib/types";

/**
 * Ouvre une séance : vérifie l'accès (RLS), enregistre la présence,
 * passe la séance « en cours » quand l'enseignant la démarre, puis redirige vers Jitsi.
 */
export async function joinMeeting(request: Request, id: string, role: Extract<Role, "teacher" | "student">) {
  const profile = await requireRole(role);
  const back = new URL(`/${role}/meetings`, request.url);
  if (!z.string().uuid().safeParse(id).success) return NextResponse.redirect(back);

  const supabase = await createClient();
  let q = supabase.from("meetings").select("id, title, room_name, starts_at, duration_minutes, status, teacher_id").eq("id", id);
  if (role === "teacher") q = q.eq("teacher_id", profile.id);
  const { data } = await q.maybeSingle();
  const meeting = data as
    | { id: string; title: string; room_name: string; starts_at: string; duration_minutes: number; status: MeetingStatus }
    | null;
  if (!meeting || !canJoin(meeting)) return NextResponse.redirect(back);

  if (role === "teacher" && meeting.status === "scheduled") {
    await supabase.from("meetings").update({ status: "live" }).eq("id", meeting.id);
  }
  await supabase
    .from("meeting_participants")
    .upsert({ meeting_id: meeting.id, user_id: profile.id }, { onConflict: "meeting_id,user_id", ignoreDuplicates: true });

  return NextResponse.redirect(
    jitsiUrl(meeting.room_name, {
      displayName: profile.full_name || profile.email,
      email: profile.email,
      subject: meeting.title,
    }),
  );
}
