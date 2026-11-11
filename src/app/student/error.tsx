"use client";
import { ErrorView } from "@/components/ui/page-states";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} />;
}
