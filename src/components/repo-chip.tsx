import { cn } from "cn";

/** Monospace repo name in an accent-tinted chip, as used across tables and cards. */
export function RepoChip({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "border-primary/20 bg-primary/8 text-primary inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[11px] leading-[14px]",
        className,
      )}
    >
      {name}
    </span>
  );
}
