import { Construction } from "lucide-react";

import { PageHeader } from "./page-header";

const REPO_URL = "https://github.com/luismgoyone/Outpost";

/** Honest placeholder for screens that are designed but not built yet. */
export function ComingSoon({
  title,
  description,
  issue,
  features,
}: {
  title: string;
  description: string;
  issue: number;
  features: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
        <div className="flex items-center gap-2.5">
          <Construction aria-hidden className="text-warning size-4" />
          <h2 className="text-[15px] font-semibold">Not built yet</h2>
          <a
            href={`${REPO_URL}/issues/${issue}`}
            className="text-primary ml-auto font-mono text-[11px] hover:underline"
          >
            Tracked in #{issue}
          </a>
        </div>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-[13px]">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
