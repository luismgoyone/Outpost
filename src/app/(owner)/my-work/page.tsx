import { CircleAlert, Clock, Eye, GitPullRequest, MessageSquareCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CiStatusBadge } from "@/components/ci-status-badge";
import { RepoChip } from "@/components/repo-chip";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { fetchAllPullRequests } from "@/lib/github/fetch-all-pull-requests";
import { daysSince, formatAge } from "@/lib/github/pull-requests";
import { buildMyWork, needsMyAction, type WorkItem } from "@/lib/my-work";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

export const metadata: Metadata = { title: "My Work · Outpost" };

export default async function MyWorkPage() {
  const session = await requireOwner("/my-work");
  const now = new Date();
  const repos = await listConnectedRepos();
  const { results, errors } = await fetchAllPullRequests(repos);
  const work = buildMyWork(
    results.map(({ repo, open, defaultBranch }) => ({
      repoId: repo.id,
      repoName: repo.name,
      open,
      defaultBranch,
    })),
    session.user.login,
    now,
  );

  return (
    <>
      <PageHeader
        title="My Work"
        count={`${work.attentionCount} need attention`}
        description={`Your inbox across ${repos.length} connected repositories`}
      />

      {errors.length > 0 && (
        <div
          role="alert"
          className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
        >
          Couldn&apos;t load {errors.map((e) => e.repo.name).join(", ")}. Check the GitHub App still
          has access.
        </div>
      )}

      {repos.length === 0 && (
        <p className="text-muted-foreground text-[13px]">
          No repositories connected.{" "}
          <Link href="/repositories" className="text-primary hover:underline">
            Connect one
          </Link>{" "}
          to fill your inbox.
        </p>
      )}

      <Panel title="Waiting on my review" count={work.reviewRequests.length} meta="newest first">
        {work.reviewRequests.length === 0 ? (
          <PanelEmpty>No reviews requested from you.</PanelEmpty>
        ) : (
          <WorkList
            label="Waiting on my review"
            items={work.reviewRequests}
            now={now}
            action={(item) => (
              <a
                href={`${item.pr.url}/files`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                <Eye aria-hidden />
                Review
              </a>
            )}
          />
        )}
      </Panel>

      <Panel
        title="My pull requests"
        count={work.myPullRequests.length}
        meta={session.user.login ? `author: @${session.user.login}` : undefined}
      >
        {work.myPullRequests.length === 0 ? (
          <PanelEmpty>You have no open pull requests.</PanelEmpty>
        ) : (
          <WorkList
            label="My pull requests"
            items={work.myPullRequests}
            now={now}
            action={(item) => (
              <a
                href={item.pr.url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  size: "sm",
                  variant: needsMyAction(item.pr) ? "destructive" : "outline",
                })}
              >
                {needsMyAction(item.pr) ? "Resolve" : "View PR"}
              </a>
            )}
          />
        )}
      </Panel>

      <Panel
        title="Stale PRs in my repos"
        count={work.stale.length}
        meta="open with no activity > 7 days"
      >
        {work.stale.length === 0 ? (
          <PanelEmpty>Nothing stale. Nice.</PanelEmpty>
        ) : (
          <WorkList
            label="Stale PRs in my repos"
            items={work.stale}
            now={now}
            action={(item) => (
              <a
                href={item.pr.url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Open
              </a>
            )}
          />
        )}
      </Panel>

      <Panel title="Failing on default branch" count={work.failingBranches.length}>
        {work.failingBranches.length === 0 ? (
          <PanelEmpty>Every default branch is green.</PanelEmpty>
        ) : (
          <ul aria-label="Failing on default branch" className="divide-y">
            {work.failingBranches.map(({ repoId, repoName, branch }) => (
              <li key={repoId} className="flex min-h-11 flex-wrap items-center gap-3 px-4 py-2">
                <CircleAlert aria-hidden className="text-destructive size-4 shrink-0" />
                <Link href={`/repositories/${repoId}`}>
                  <RepoChip name={repoName} />
                </Link>
                <span className="font-mono text-[11px]">{branch.name}</span>
                <span className="min-w-0 flex-1 truncate">{branch.message}</span>
                <span className="bg-panel text-muted-foreground rounded-sm border px-1.5 font-mono text-[11px]">
                  {branch.sha.slice(0, 7)}
                </span>
                <StatusBadge tone="danger" label="CI failing" boxed />
                {branch.url && (
                  <a
                    href={branch.url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    View commit
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function WorkList({
  label,
  items,
  now,
  action,
}: {
  label: string;
  items: WorkItem[];
  now: Date;
  action: (item: WorkItem) => React.ReactNode;
}) {
  return (
    <ul aria-label={label} className="divide-y">
      {items.map((item) => {
        const { pr } = item;
        const staleDays = daysSince(pr.updatedAt, now);
        return (
          <li
            key={`${item.repoId}#${pr.number}`}
            className="hover:bg-surface-hover/60 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 transition-colors duration-100"
          >
            <Link href={`/repositories/${item.repoId}`}>
              <RepoChip name={item.repoName} />
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {pr.reviewState === "changes_requested" ? (
                <MessageSquareCode aria-hidden className="text-destructive size-3.5 shrink-0" />
              ) : (
                <GitPullRequest aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
              )}
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary truncate font-medium transition-colors"
              >
                {pr.title}
              </a>
              <span className="text-subtle-foreground font-mono text-[11px]">#{pr.number}</span>
            </div>
            <span className="text-muted-foreground hidden font-mono text-[11px] md:inline">
              @{pr.author?.login ?? "ghost"}
            </span>
            {staleDays > 7 ? (
              <span className="border-warning/30 bg-warning/10 text-warning inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px]">
                <Clock aria-hidden className="size-3" />
                Stale: {staleDays}d
              </span>
            ) : (
              <span className="text-muted-foreground font-mono text-[11px]">
                {formatAge(pr.updatedAt, now)} ago
              </span>
            )}
            <ReviewStatusBadge pr={pr} />
            <CiStatusBadge status={pr.ciStatus} />
            <span className="hidden font-mono text-[11px] lg:inline">
              <span className="text-success">+{pr.additions}</span>{" "}
              <span className="text-destructive">-{pr.deletions}</span>
            </span>
            {action(item)}
          </li>
        );
      })}
    </ul>
  );
}
