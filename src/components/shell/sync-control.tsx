"use client";

import { cn } from "cn";
import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

/** Header sync indicator + button. Shows a spinner and "Syncing…" while the action runs. */
export function SyncControl({ label, action }: { label: string; action: () => Promise<void> }) {
  return (
    <form action={action} className="ml-auto flex items-center gap-2">
      <SyncState label={label} />
    </form>
  );
}

// useFormStatus only works in a child of the <form>.
function SyncState({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <span
        role="status"
        className="text-muted-foreground bg-panel flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px]"
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            pending ? "bg-primary motion-safe:animate-pulse" : "bg-success",
          )}
        />
        {pending ? "Syncing…" : label}
      </span>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="bg-secondary flex h-7 items-center gap-1.5 rounded-sm border px-2.5 text-[13px] transition-colors hover:bg-white/8 disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw aria-hidden className={cn("size-3.5", pending && "motion-safe:animate-spin")} />
        {pending ? "Syncing" : "Sync"}
      </button>
    </>
  );
}
