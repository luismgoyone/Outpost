import { GitMerge, GitPullRequest, GitPullRequestDraft } from "lucide-react";

import { CiStatusBadge } from "@/components/ci-status-badge";
import { PanelEmpty } from "@/components/shell/panel";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PullRequest } from "@/lib/github/pull-requests";

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

export function PullRequestTable({
  pullRequests,
  dateField,
  dateLabel,
  emptyMessage,
}: {
  pullRequests: PullRequest[];
  dateField: "updatedAt" | "mergedAt";
  dateLabel: string;
  emptyMessage: string;
}) {
  if (pullRequests.length === 0) return <PanelEmpty>{emptyMessage}</PanelEmpty>;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Pull request</TableHead>
          <TableHead className="hidden sm:table-cell">Author</TableHead>
          <TableHead>CI status</TableHead>
          <TableHead className="pr-4 text-right">{dateLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pullRequests.map((pr) => {
          const date = pr[dateField];
          const Icon = pr.mergedAt ? GitMerge : pr.isDraft ? GitPullRequestDraft : GitPullRequest;
          return (
            <TableRow key={pr.number}>
              <TableCell className="w-full max-w-0 pl-4">
                <div className="flex items-center gap-2">
                  <Icon
                    aria-hidden
                    className={
                      pr.mergedAt
                        ? "text-primary size-3.5 shrink-0"
                        : "text-muted-foreground size-3.5 shrink-0"
                    }
                  />
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary truncate font-medium transition-colors"
                  >
                    {pr.title}
                  </a>
                  <span className="text-subtle-foreground font-mono text-[11px]">#{pr.number}</span>
                  {pr.isDraft && <StatusBadge tone="neutral" label="Draft" boxed />}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden font-mono text-[11px] sm:table-cell">
                @{pr.author?.login ?? "ghost"}
              </TableCell>
              <TableCell>
                <CiStatusBadge status={pr.ciStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground pr-4 text-right font-mono text-[11px] tabular-nums">
                {date ? <time dateTime={date}>{dateFormat.format(new Date(date))}</time> : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
