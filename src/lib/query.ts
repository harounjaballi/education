import "server-only";

type Result<T> = { data: T | null; error: { message: string } | null; count?: number | null };

/** Lève l'erreur Supabase pour qu'elle soit captée par le error.tsx du segment. */
export function must<T>(res: Result<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function mustCount(res: Result<unknown>): number {
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}
