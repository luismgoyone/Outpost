import { cn } from "cn";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const tones: Record<StatusTone, { text: string; dot: string; box: string }> = {
  success: { text: "text-success", dot: "bg-success", box: "bg-success/8 border-success/20" },
  warning: { text: "text-warning", dot: "bg-warning", box: "bg-warning/8 border-warning/20" },
  danger: {
    text: "text-destructive",
    dot: "bg-destructive",
    box: "bg-destructive/8 border-destructive/20",
  },
  neutral: {
    text: "text-muted-foreground",
    dot: "bg-neutral",
    box: "bg-neutral/8 border-neutral/20",
  },
  info: { text: "text-primary", dot: "bg-primary", box: "bg-primary/8 border-primary/20" },
};

/** Status is always a dot plus a monospace label (design system rule: never color alone). */
export function StatusBadge({
  tone,
  label,
  boxed = false,
  className,
  ...props
}: {
  tone: StatusTone;
  label: string;
  /** Tinted container with border; the plain variant is for dense table cells. */
  boxed?: boolean;
} & React.ComponentProps<"span">) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] leading-[14px] whitespace-nowrap",
        t.text,
        boxed && ["rounded-sm border px-1.5 py-0.5", t.box],
        className,
      )}
      {...props}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
      {label}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 rounded-full", tones[tone].dot, className)}
    />
  );
}
