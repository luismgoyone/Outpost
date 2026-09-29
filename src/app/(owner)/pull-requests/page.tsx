import { cn } from "cn";
import { ArrowDownUp, Clock, GitPullRequest, GitPullRequestDraft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CiStatusBadge } from "@/components/ci-status-badge";
import { RepoChip } from "@/components/repo-chip";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAllPullRequests } from "@/lib/github/fetch-all-pull-requests";
import { daysSince, formatAge, isStale } from "@/lib/github/pull-requests";
import { requireOwner } from "@/lib/owner";
import {
  applyFilters,
  countByView,
  filterHref,
  parseFilters,
  type PullRequestRow,
  type View,
} from "@/lib/pull-request-filters";
import { listConnectedRepos } from "@/lib/repos";

import { RepoSelect } from "./repo-select";

export const metadata: Metadata = { title: "Pull Requests · Outpost" };

const VIEW_LABELS: Record<View, string> = {
  all: "All",
  mine: "Mine",
  "needs-review": "Needs review",
  stale: "Stale (>7d)",
  failing: "Failing CI",
};

export default async function PullRequestsPage(props: PageProps<"/pull-requests">) {
  const session = await requireOwner("/pull-requests");
  const filters = parseFilters(await props.searchParams);
  const ctx = { ownerLogin: session.user.login, now: new Date() };

  const repos = await listConnectedRepos();
  const { results, errors } = await fetchAllPullRequests(repos);
  const rows: PullRequestRow[] = results.flatMap(({ repo, open }) =>
    open.map((pr) => ({ repoId: repo.id, repoName: repo.name, pr })),
  );
  const visible = applyFilters(rows, filters, ctx);
  const counts = countByView(rows, filters.repo, ctx);
  const totals = countByView(rows, null, ctx);
  const passing = rows.filter((r) => r.pr.ciStatus === "success").length;

  const repoNames = [...new Set(repos.map((r) => r.name))].sort();
  const repoHrefs = Object.fromEntries([
    ["__all", filterHref(filters, { repo: null })],
    ...repoNames.map((name) => [name, filterHref(filters, { repo: name })]),
  ]);

  return (
    <>
      <PageHeader
        title="Pull Requests"
        count={`${repos.length} repositories`}
        description={`${rows.length} open pull requests across ${repos.length} connected repositories`}
        actions={
          <div aria-label="Summary" className="flex items-center gap-2">
            <StatusBadge boxed tone="danger" label={`${totals.failing} failing CI`} />
            <StatusBadge boxed tone="warning" label={`${totals.stale} stale (>7d)`} />
            <StatusBadge boxed tone="success" label={`${passing} passing`} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <RepoSelect repos={repoNames} value={filters.repo} hrefFor={repoHrefs} />
        <nav aria-label="Filters" className="flex flex-wrap gap-1.5">
          {(Object.keys(VIEW_LABELS) as View[]).map((view) => {
            const active = filters.view === view;
            return (
              <Link
                key={view}
                href={filterHref(filters, { view })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-sm border px-2.5 font-mono text-[11px] transition-colors duration-100",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-white/8",
                )}
              >
                {VIEW_LABELS[view]}
                <span className={active ? "text-primary" : "text-subtle-foreground"}>
                  {counts[view]}
                </span>
              </Link>
            );
          })}
        </nav>
        <Link
          href={filterHref(filters, { sort: filters.sort === "oldest" ? "newest" : "oldest" })}
          className="text-muted-foreground hover:text-foreground ml-auto flex h-7 items-center gap-1.5 font-mono text-[11px]"
        >
          <ArrowDownUp aria-hidden className="size-3.5" />
          Sorted by: <span className="text-primary">{filters.sort} first</span>
        </Link>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
        >
          Couldn&apos;t load {errors.map((e) => e.repo.name).join(", ")}. Check the GitHub App still
          has access.
        </div>
      )}

      <Panel
        title="Open pull requests"
        count={visible.length}
        meta={`showing ${visible.length} of ${rows.length}`}
      >
        {repos.length === 0 ? (
          <PanelEmpty>
            No repositories connected.{" "}
            <Link href="/repositories" className="text-primary hover:underline">
              Connect one
            </Link>{" "}
            to see its pull requests.
          </PanelEmpty>
        ) : visible.length === 0 ? (
          <PanelEmpty>No pull requests match these filters.</PanelEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Repo</TableHead>
                <TableHead>Pull request</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>CI status</TableHead>
                <TableHead>Review</TableHead>
                <TableHead className="hidden pr-4 xl:table-cell">Branch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(({ repoId, repoName, pr }) => {
                const stale = isStale(pr, ctx.now);
                const mine =
                  !!ctx.ownerLogin &&
                  pr.author?.login.toLowerCase() === ctx.ownerLogin.toLowerCase();
                const Icon = pr.isDraft ? GitPullRequestDraft : GitPullRequest;
                return (
                  <TableRow key={`${repoId}#${pr.number}`} data-stale={stale || undefined}>
                    <TableCell className="pl-4">
                      <Link href={`/repositories/${repoId}`}>
                        <RepoChip name={repoName} />
                      </Link>
                    </TableCell>
                    <TableCell className="w-full max-w-0">
                      <div className="flex items-center gap-2">
                        <Icon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary truncate font-medium transition-colors"
                        >
                          {pr.title}
                        </a>
                        <span className="text-subtle-foreground font-mono text-[11px]">
                          #{pr.number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-[11px] md:table-cell">
                      {mine ? (
                        <span className="bg-primary/15 text-primary rounded-sm px-1.5 py-0.5">
                          You
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          @{pr.author?.login ?? "ghost"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {stale ? (
                        <span className="border-warning/30 bg-warning/10 text-warning inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5">
                          <Clock aria-hidden className="size-3" />
                          Stale: {daysSince(pr.updatedAt, ctx.now)}d
                        </span>
                      ) : (
                        <time dateTime={pr.createdAt} className="text-muted-foreground">
                          {formatAge(pr.createdAt, ctx.now)} ago
                        </time>
                      )}
                    </TableCell>
                    <TableCell>
                      <CiStatusBadge status={pr.ciStatus} />
                    </TableCell>
                    <TableCell>
                      <ReviewStatusBadge pr={pr} />
                    </TableCell>
                    <TableCell className="text-subtle-foreground hidden max-w-48 truncate pr-4 font-mono text-[11px] xl:table-cell">
                      {pr.headRefName}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
