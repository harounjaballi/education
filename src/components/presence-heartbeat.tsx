"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Signale régulièrement que l'utilisateur est actif (présence « en ligne »). */
export function PresenceHeartbeat({ everyMs = 60_000 }: { everyMs?: number }) {
  useEffect(() => {
    const supabase = createClient();
    const ping = () => {
      if (document.visibilityState === "visible")
        void supabase.rpc("touch_last_seen").then(() => undefined);
    };
    ping();
    const id = setInterval(ping, everyMs);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [everyMs]);
  return null;
}
