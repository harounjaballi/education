import clsx from "clsx";

type Kind = "pdf" | "word" | "powerpoint" | "image" | "video" | "other";

const KINDS: Record<Kind, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "#DC2626" },
  word: { label: "DOC", color: "#2563EB" },
  powerpoint: { label: "PPT", color: "#EA580C" },
  image: { label: "IMG", color: "#059669" },
  video: { label: "VID", color: "#7C3AED" },
  other: { label: "FIC", color: "#64748B" },
};

/** Type de fichier d'après le type MIME, ou à défaut l'extension du nom. */
export function fileKind(mime?: string | null, name?: string | null): Kind {
  const m = (mime ?? "").toLowerCase();
  const ext = (name ?? "").toLowerCase().split(".").pop() ?? "";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.includes("wordprocessingml") || m === "application/msword" || ext === "doc" || ext === "docx") return "word";
  if (m.includes("presentationml") || m === "application/vnd.ms-powerpoint" || ext === "ppt" || ext === "pptx")
    return "powerpoint";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (m.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext)) return "video";
  return "other";
}

/** Icône de fichier avec pastille colorée (PDF rouge, Word bleu, PowerPoint orange…). */
export function FileIcon({
  mime,
  name,
  className,
}: {
  mime?: string | null;
  name?: string | null;
  className?: string;
}) {
  const { label, color } = KINDS[fileKind(mime, name)];
  return (
    <svg viewBox="0 0 32 40" className={clsx("h-8 w-[26px] shrink-0", className)} aria-hidden>
      <path d="M3 1h18l10 10v26a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="#fff" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M21 1v8a2 2 0 0 0 2 2h8" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="0" y="22" width="26" height="12" rx="2" fill={color} />
      <text
        x="13"
        y="31"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="#fff"
      >
        {label}
      </text>
    </svg>
  );
}
