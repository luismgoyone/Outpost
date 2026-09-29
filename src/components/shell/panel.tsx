import { cn } from "cn";
import { useId } from "react";

/** Elevated card surface with a compact header, used for every content block. */
export function Panel({
  title,
  count,
  meta,
  children,
  className,
}: {
  title: string;
  count?: number;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "bg-card overflow-hidden rounded-lg border shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)]",
        className,
      )}
    >
      <div className="flex h-11 items-center gap-2.5 border-b px-4">
        <h2 id={id} className="text-[15px] leading-5 font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {count !== undefined && (
          <span className="bg-panel text-muted-foreground rounded-sm px-1.5 font-mono text-[11px]">
            {count}
          </span>
        )}
        {meta && <div className="text-subtle-foreground ml-auto font-mono text-[11px]">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground px-4 py-6 text-[13px]">{children}</p>;
}
