import { cn } from "cn";
import { CircleCheck, CircleX, Loader } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/github/deployments";
import { formatAge } from "@/lib/github/pull-requests";
import type { RunState, WorkflowSummary } from "@/lib/github/workflows";

const RUN: Record<RunState, { label: string; tone: StatusTone; cell: string }> = {
  success: { label: "Passing", tone: "success", cell: "bg-success" },
  failure: { label: "Failed", tone: "danger", cell: "bg-destructive" },
  running: { label: "Running", tone: "info", cell: "bg-primary" },
  cancelled: { label: "Canceled", tone: "neutral", cell: "bg-neutral" },
  skipped: { label: "Skipped", tone: "neutral", cell: "bg-neutral/50" },
};

export function WorkflowTable({ workflows, now }: { workflows: WorkflowSummary[]; now: Date }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Workflow</TableHead>
          <TableHead className="hidden md:table-cell">Trigger</TableHead>
          <TableHead className="hidden md:table-cell">Branch</TableHead>
          <TableHead className="hidden lg:table-cell">Duration</TableHead>
          <TableHead>Last 10 runs</TableHead>
          <TableHead className="pr-4">Status / age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workflows.map((w) => {
          const Icon =
            w.latest.state === "success"
              ? CircleCheck
              : w.latest.state === "running"
                ? Loader
                : CircleX;
          return (
            <TableRow key={w.workflowId} aria-label={w.name}>
              <TableCell className="pl-4">
                <div className="flex items-center gap-2">
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0",
                      w.latest.state === "success" && "text-success",
                      w.latest.state === "failure" && "text-destructive",
                      w.latest.state === "running" && "text-primary",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-subtle-foreground font-mono text-[11px]">{w.path}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden font-mono text-[11px] md:table-cell">
                {w.events.join(" / ")}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {w.latest.branch && (
                  <span className="bg-panel text-primary rounded-sm border px-1.5 py-0.5 font-mono text-[11px]">
                    {w.latest.branch}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground hidden font-mono text-[11px] lg:table-cell">
                {formatDuration(w.typicalDuration)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ol
                    aria-label={`Last ${w.lastRuns.length} runs of ${w.name}`}
                    className="flex gap-0.5"
                  >
                    {w.lastRuns.map((run) => (
                      <li key={run.id}>
                        <a
                          href={run.url}
                          target="_blank"
                          rel="noreferrer"
                          title={`${RUN[run.state].label} · ${run.branch ?? ""} · ${formatAge(run.startedAt, now)} ago`}
                          aria-label={`${RUN[run.state].label} run`}
                          className={cn("block h-4 w-2 rounded-[2px]", RUN[run.state].cell)}
                        />
                      </li>
                    ))}
                  </ol>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {w.passRate === null ? "—" : `${Math.round(w.passRate * 100)}%`}
                  </span>
                </div>
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={RUN[w.latest.state].tone} label={RUN[w.latest.state].label} />
                  <a
                    href={w.latest.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-subtle-foreground hover:text-foreground font-mono text-[11px]"
                  >
                    {formatAge(w.latest.startedAt, now)} ago
                  </a>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
