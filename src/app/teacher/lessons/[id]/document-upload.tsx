"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COURSE_FILE_MAX, COURSE_FILE_TYPES } from "@/lib/media";
import { registerDocument } from "../../courses/actions";

type Labels = { upload: string; uploading: string; uploadError: string; badType: string; tooBig: string };

/** Nom de fichier sûr pour une clé Storage (sans accents ni caractères spéciaux). */
function safeName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-100);
  return clean || "fichier";
}

/**
 * Envoi direct du navigateur vers Supabase Storage (pas de limite de taille
 * des Server Actions), puis enregistrement du fichier côté serveur.
 */
export function DocumentUpload({ teacherId, lessonId, labels }: { teacherId: string; lessonId: string; labels: Labels }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setErrors([]);
    const supabase = createClient();
    const problems: string[] = [];

    for (const file of Array.from(list)) {
      if (!COURSE_FILE_TYPES.includes(file.type)) {
        problems.push(`${file.name} : ${labels.badType}`);
        continue;
      }
      if (file.size > COURSE_FILE_MAX) {
        problems.push(`${file.name} : ${labels.tooBig}`);
        continue;
      }
      const path = `${teacherId}/${lessonId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(file.name)}`;
      const { error } = await supabase.storage
        .from("course-files")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        problems.push(`${file.name} : ${labels.uploadError}`);
        continue;
      }
      const res = await registerDocument(lessonId, { name: file.name, path, type: file.type, size: file.size });
      if (!res.ok) problems.push(`${file.name} : ${labels.uploadError}`);
    }

    setErrors(problems);
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <label className={`btn-secondary w-full cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        {busy ? labels.uploading : labels.upload}
        <input
          ref={input}
          type="file"
          multiple
          accept={COURSE_FILE_TYPES.join(",")}
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
