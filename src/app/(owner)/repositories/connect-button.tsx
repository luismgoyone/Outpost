"use client";

import { Loader2, Plus } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** Submit button for one repo's connect form; shows a spinner while connecting. */
export function ConnectButton({ fullName }: { fullName: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      size="sm"
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? `Connecting ${fullName}` : `Connect ${fullName}`}
      className="disabled:cursor-wait"
    >
      {pending ? (
        <Loader2 aria-hidden className="motion-safe:animate-spin" />
      ) : (
        <Plus aria-hidden />
      )}
      {pending ? "Connecting…" : "Connect"}
    </Button>
  );
}
