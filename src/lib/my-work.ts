/**
 * The owner's inbox, built from the same per-repo snapshots as the Pull Requests screen.
 * Pure, so it's unit-tested and independent of GitHub.
 */
import { isStale, type DefaultBranch, type PullRequest } from "@/lib/github/pull-requests";

export type RepoSnapshot = {
  repoId: string;
  repoName: string;
  open: PullRequest[];
  defaultBranch: DefaultBranch | null;
};

export type WorkItem = { repoId: string; repoName: string; pr: PullRequest };
export type FailingBranch = { repoId: string; repoName: string; branch: DefaultBranch };

export type MyWork = {
  /** Open, non-draft PRs by others where the owner's review is requested. Newest first. */
  reviewRequests: WorkItem[];
  /** Open PRs authored by the owner. Most recently updated first. */
  myPullRequests: WorkItem[];
  /** Other people's PRs with no activity for 7+ days. Oldest first. */
  stale: WorkItem[];
  /** Repos whose default branch CI is failing. */
  failingBranches: FailingBranch[];
  /** Items that need the owner to act. */
  attentionCount: number;
};

const same = (a: string | undefined, b: string | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** My PR needs me when a reviewer asked for changes or its CI is failing. */
export function needsMyAction(pr: PullRequest): boolean {
  return pr.reviewState === "changes_requested" || pr.ciStatus === "failure";
}

export function buildMyWork(
  snapshots: RepoSnapshot[],
  ownerLogin: string | undefined,
  now: Date,
): MyWork {
  const items: WorkItem[] = snapshots.flatMap(({ repoId, repoName, open }) =>
    open.map((pr) => ({ repoId, repoName, pr })),
  );
  const byUpdatedDesc = (a: WorkItem, b: WorkItem) => b.pr.updatedAt.localeCompare(a.pr.updatedAt);
  const isMine = (item: WorkItem) => same(item.pr.author?.login, ownerLogin);

  const reviewRequests = items
    .filter(
      (item) =>
        !isMine(item) &&
        !item.pr.isDraft &&
        item.pr.requestedReviewers.some((reviewer) => same(reviewer, ownerLogin)),
    )
    .sort(byUpdatedDesc);

  const myPullRequests = items.filter(isMine).sort(byUpdatedDesc);

  const stale = items
    .filter((item) => !isMine(item) && isStale(item.pr, now))
    .sort((a, b) => a.pr.updatedAt.localeCompare(b.pr.updatedAt));

  const failingBranches = snapshots.flatMap(({ repoId, repoName, defaultBranch }) =>
    defaultBranch?.ciStatus === "failure" ? [{ repoId, repoName, branch: defaultBranch }] : [],
  );

  return {
    reviewRequests,
    myPullRequests,
    stale,
    failingBranches,
    attentionCount:
      reviewRequests.length +
      myPullRequests.filter((item) => needsMyAction(item.pr)).length +
      stale.length +
      failingBranches.length,
  };
}
