/**
 * Pull request query and mapping. Pure (no I/O), so it can be unit-tested and
 * reused by the owner dashboard and the public share page.
 */

export type CiStatus = "success" | "failure" | "pending" | "none";

export type ReviewState = "draft" | "approved" | "changes_requested" | "awaiting_review";

export type PullRequest = {
  number: number;
  title: string;
  url: string;
  author: { login: string; avatarUrl: string } | null;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  ciStatus: CiStatus;
  reviewState: ReviewState;
  /** Distinct reviewers whose latest opinionated review is an approval. */
  approvals: number;
  /** Logins (users) and slugs (teams) whose review is requested. */
  requestedReviewers: string[];
  headRefName: string;
  additions: number;
  deletions: number;
};

export type RepoPullRequests = { open: PullRequest[]; merged: PullRequest[] };

const PULL_REQUEST_FIELDS = /* GraphQL */ `
  fragment PullRequestFields on PullRequest {
    number
    title
    url
    isDraft
    createdAt
    updatedAt
    mergedAt
    author {
      login
      avatarUrl
    }
    headRefName
    additions
    deletions
    reviewDecision
    latestOpinionatedReviews(first: 20) {
      nodes {
        state
      }
    }
    reviewRequests(first: 20) {
      nodes {
        requestedReviewer {
          ... on User {
            login
          }
          ... on Team {
            slug
          }
        }
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
          }
        }
      }
    }
  }
`;

export const PULL_REQUESTS_QUERY = /* GraphQL */ `
  query RepoPullRequests($owner: String!, $name: String!, $openCount: Int!, $mergedCount: Int!) {
    repository(owner: $owner, name: $name) {
      open: pullRequests(
        states: OPEN
        first: $openCount
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          ...PullRequestFields
        }
      }
      merged: pullRequests(
        states: MERGED
        first: $mergedCount
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          ...PullRequestFields
        }
      }
    }
  }
  ${PULL_REQUEST_FIELDS}
`;

/** GitHub's StatusState enum, as returned by statusCheckRollup.state. */
type RollupState = "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED";

type ReviewDecision = "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED";

type PullRequestNode = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  author: { login: string; avatarUrl: string } | null;
  headRefName?: string;
  additions?: number;
  deletions?: number;
  reviewDecision?: ReviewDecision | null;
  latestOpinionatedReviews?: { nodes: Array<{ state: string } | null> | null } | null;
  reviewRequests?: {
    nodes: Array<{ requestedReviewer: { login?: string; slug?: string } | null } | null> | null;
  } | null;
  commits: {
    nodes: Array<{ commit: { statusCheckRollup: { state: RollupState } | null } } | null> | null;
  };
};

export type PullRequestsQueryResult = {
  repository: {
    open: { nodes: Array<PullRequestNode | null> | null };
    merged: { nodes: Array<PullRequestNode | null> | null };
  } | null;
};

export function toCiStatus(state: RollupState | null | undefined): CiStatus {
  switch (state) {
    case "SUCCESS":
      return "success";
    case "FAILURE":
    case "ERROR":
      return "failure";
    case "PENDING":
    case "EXPECTED":
      return "pending";
    default:
      return "none";
  }
}

export function toReviewState(
  isDraft: boolean,
  decision: ReviewDecision | null | undefined,
): ReviewState {
  if (isDraft) return "draft";
  if (decision === "APPROVED") return "approved";
  if (decision === "CHANGES_REQUESTED") return "changes_requested";
  return "awaiting_review";
}

function toPullRequest(node: PullRequestNode): PullRequest {
  const lastCommit = node.commits.nodes?.at(-1)?.commit;
  const approvals = compact(node.latestOpinionatedReviews?.nodes).filter(
    (r) => r.state === "APPROVED",
  ).length;
  const requestedReviewers = compact(node.reviewRequests?.nodes)
    .map((r) => r.requestedReviewer?.login ?? r.requestedReviewer?.slug)
    .filter((name): name is string => !!name);
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    author: node.author ? { login: node.author.login, avatarUrl: node.author.avatarUrl } : null,
    isDraft: node.isDraft,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    mergedAt: node.mergedAt,
    ciStatus: toCiStatus(lastCommit?.statusCheckRollup?.state),
    reviewState: toReviewState(node.isDraft, node.reviewDecision),
    approvals,
    requestedReviewers,
    headRefName: node.headRefName ?? "",
    additions: node.additions ?? 0,
    deletions: node.deletions ?? 0,
  };
}

function compact<T>(nodes: Array<T | null> | null | undefined): T[] {
  return (nodes ?? []).filter((n): n is T => n !== null);
}

/** Map the GraphQL response. Merged PRs are sorted newest merge first. */
export function mapPullRequests(result: PullRequestsQueryResult): RepoPullRequests {
  if (!result.repository) return { open: [], merged: [] };
  const open = compact(result.repository.open.nodes).map(toPullRequest);
  const merged = compact(result.repository.merged.nodes)
    .map(toPullRequest)
    .sort((a, b) => (b.mergedAt ?? "").localeCompare(a.mergedAt ?? ""));
  return { open, merged };
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_AFTER_DAYS = 7;

/** An open PR with no activity (updates) for more than 7 days. */
export function isStale(pr: Pick<PullRequest, "updatedAt" | "mergedAt">, now: Date): boolean {
  if (pr.mergedAt) return false;
  return now.getTime() - new Date(pr.updatedAt).getTime() > STALE_AFTER_DAYS * DAY_MS;
}

/** Compact age like the designs: "45m", "4h", "3d", "2w". */
export function formatAge(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}
