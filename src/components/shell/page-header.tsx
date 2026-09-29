export function PageHeader({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  count?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-2xl leading-8 font-semibold tracking-[-0.02em]">{title}</h1>
          {count && (
            <span className="bg-panel text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[11px]">
              {count}
            </span>
          )}
        </div>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
