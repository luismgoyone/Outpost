import { cn } from "cn";
import { ExternalLink, FileText, GitBranch } from "lucide-react";
import Link from "next/link";

import { RepoChip } from "@/components/repo-chip";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeploymentRow } from "@/lib/deployment-filters";
import { formatDuration, type DeployState, type EnvironmentKind } from "@/lib/github/deployments";
import { formatAge } from "@/lib/github/pull-requests";

const STATUS: Record<DeployState, { label: string; tone: StatusTone }> = {
  success: { label: "Deployed", tone: "success" },
  failure: { label: "Failed", tone: "danger" },
  building: { label: "Building", tone: "info" },
  inactive: { label: "Superseded", tone: "neutral" },
  unknown: { label: "Unknown", tone: "neutral" },
};

const ENV_TONE: Record<EnvironmentKind, StatusTone> = {
  production: "success",
  staging: "info",
  preview: "neutral",
  other: "neutral",
};

export function DeploymentTable({ rows, now }: { rows: DeploymentRow[]; now: Date }) {
  const visible = rows;
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Repository</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Commit</TableHead>
          <TableHead className="hidden md:table-cell">Triggered by</TableHead>
          <TableHead className="hidden lg:table-cell">Duration</TableHead>
          <TableHead className="pr-4">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map(({ repoId, repoName, deployment: d }) => (
          <TableRow key={d.id} className={d.state === "failure" ? "bg-destructive/5" : undefined}>
            <TableCell className="pl-4">
              <div className="flex flex-col items-start gap-0.5">
                <Link href={`/repositories/${repoId}`}>
                  <RepoChip name={repoName} />
                </Link>
                <span className="text-subtle-foreground font-mono text-[11px]">
                  {formatAge(d.createdAt, now)} ago
                </span>
              </div>
            </TableCell>
            <TableCell>
              <StatusBadge boxed tone={ENV_TONE[d.environmentKind]} label={d.environment} />
            </TableCell>
            <TableCell className="w-full max-w-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
                  {d.ref && (
                    <>
                      <GitBranch aria-hidden className="size-3" />
                      <span className="truncate">{d.ref}</span>
                      <span aria-hidden>·</span>
                    </>
                  )}
                  <span className="bg-panel rounded-sm border px-1">{d.sha.slice(0, 7)}</span>
                </span>
                <span
                  className={cn("truncate", d.state === "failure" && "text-destructive")}
                  title={d.message}
                >
                  {d.message || "—"}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground hidden font-mono text-[11px] md:table-cell">
              {d.creator ? `@${d.creator}` : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground hidden font-mono text-[11px] lg:table-cell">
              {formatDuration(d.durationSeconds)}
            </TableCell>
            <TableCell className="pr-4">
              <div className="flex items-center gap-2">
                <StatusBadge boxed {...STATUS[d.state]} />
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit ${repoName} ${d.environment}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                )}
                {d.logUrl && (
                  <a
                    href={d.logUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Logs for ${repoName} ${d.environment}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <FileText aria-hidden className="size-3.5" />
                  </a>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
