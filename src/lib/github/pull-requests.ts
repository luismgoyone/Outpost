/**
 * Pull request query and mapping. Pure (no I/O), so it can be unit-tested and
 * reused by the owner dashboard and the public share page.
 */

export type CiStatus = "success" | "failure" | "pending" | "none";

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

type PullRequestNode = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  author: { login: string; avatarUrl: string } | null;
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

function toPullRequest(node: PullRequestNode): PullRequest {
  const lastCommit = node.commits.nodes?.at(-1)?.commit;
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
