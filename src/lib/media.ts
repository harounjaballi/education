/** Fichiers acceptés par le bucket « course-files » (voir migration 0003). */
export const COURSE_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
export const COURSE_FILE_MAX = 524_288_000;

export function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export type VideoProvider = "youtube" | "vimeo" | "external";

export function videoProvider(url: string): VideoProvider {
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(hostOf(url))) return "youtube";
  if (/(^|\.)vimeo\.com$/i.test(hostOf(url))) return "vimeo";
  return "external";
}

/** Adresse intégrable (iframe) pour YouTube et Vimeo, sinon null. */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/)?.[2];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
