/** Visioconférences : ouverture des salles Jitsi Meet. */

export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

/** Serveur Jitsi (meet.jit.si par défaut, ou une instance auto-hébergée). */
export const JITSI_DOMAIN = (process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si").replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** On peut rejoindre 15 min avant le début et jusqu'à 1 h après la fin prévue. */
const OPEN_BEFORE_MS = 15 * 60_000;
const CLOSE_AFTER_MS = 60 * 60_000;

export function meetingWindow(m: { starts_at: string; duration_minutes: number }) {
  const start = new Date(m.starts_at).getTime();
  return { opensAt: start - OPEN_BEFORE_MS, closesAt: start + m.duration_minutes * 60_000 + CLOSE_AFTER_MS };
}

export function canJoin(m: { starts_at: string; duration_minutes: number; status: MeetingStatus }, now = Date.now()) {
  if (m.status === "ended" || m.status === "cancelled") return false;
  const w = meetingWindow(m);
  return now >= w.opensAt && now <= w.closesAt;
}

/** Séance terminée, annulée ou dont la fenêtre est passée. */
export function isPast(m: { starts_at: string; duration_minutes: number; status: MeetingStatus }, now = Date.now()) {
  return m.status === "ended" || m.status === "cancelled" || now > meetingWindow(m).closesAt;
}

export function jitsiUrl(room: string, opts: { displayName: string; subject: string; email?: string }) {
  const cfg = [
    `userInfo.displayName=${JSON.stringify(opts.displayName)}`,
    ...(opts.email ? [`userInfo.email=${JSON.stringify(opts.email)}`] : []),
    `config.subject=${JSON.stringify(opts.subject)}`,
    "config.prejoinConfig.enabled=false",
  ].map(encodeURIComponent);
  return `https://${JITSI_DOMAIN}/${encodeURIComponent(room)}#${cfg.join("&")}`;
}
