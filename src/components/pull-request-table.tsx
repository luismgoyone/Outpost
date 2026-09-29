import { CiStatusBadge } from "@/components/ci-status-badge";
import { Badge } from "@/components/ui/badge";
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
  if (pullRequests.length === 0) {
    return <p className="text-muted-foreground py-6 text-sm">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pull request</TableHead>
          <TableHead className="hidden sm:table-cell">Author</TableHead>
          <TableHead>CI</TableHead>
          <TableHead className="text-right">{dateLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pullRequests.map((pr) => {
          const date = pr[dateField];
          return (
            <TableRow key={pr.number}>
              <TableCell className="w-full max-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium hover:underline"
                  >
                    {pr.title}
                  </a>
                  {pr.isDraft && <Badge variant="outline">Draft</Badge>}
                </div>
                <span className="text-muted-foreground text-xs">#{pr.number}</span>
              </TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">
                {pr.author?.login ?? "ghost"}
              </TableCell>
              <TableCell>
                <CiStatusBadge status={pr.ciStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {date ? <time dateTime={date}>{dateFormat.format(new Date(date))}</time> : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
