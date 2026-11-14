"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recharge les données de la page à intervalle régulier (nouveaux messages). */
export function AutoRefresh({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);
    return () => clearInterval(id);
  }, [router, ms]);
  return null;
}
