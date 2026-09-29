import { describe, expect, it } from "vitest";

import {
  mapPullRequests,
  toCiStatus,
  type PullRequestsQueryResult,
} from "@/lib/github/pull-requests";

type Node = NonNullable<
  NonNullable<PullRequestsQueryResult["repository"]>["open"]["nodes"]
>[number];

function node(overrides: Partial<NonNullable<Node>> & { state?: string | null } = {}) {
  const { state = "SUCCESS", ...rest } = overrides;
  return {
    number: 1,
    title: "Add thing",
    url: "https://github.com/acme/app/pull/1",
    isDraft: false,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-02T00:00:00Z",
    mergedAt: null,
    author: { login: "octocat", avatarUrl: "https://avatars.example/octocat" },
    commits: {
      nodes: [{ commit: { statusCheckRollup: state ? { state } : null } }],
    },
    ...rest,
  } as NonNullable<Node>;
}

describe("toCiStatus", () => {
  it.each([
    ["SUCCESS", "success"],
    ["FAILURE", "failure"],
    ["ERROR", "failure"],
    ["PENDING", "pending"],
    ["EXPECTED", "pending"],
    [null, "none"],
    [undefined, "none"],
  ] as const)("%s → %s", (state, expected) => {
    expect(toCiStatus(state)).toBe(expected);
  });
});

describe("mapPullRequests", () => {
  it("maps open and merged PRs with CI status from the last commit", () => {
    const result = mapPullRequests({
      repository: {
        open: { nodes: [node({ number: 3, state: "FAILURE", isDraft: true })] },
        merged: {
          nodes: [
            node({ number: 1, mergedAt: "2026-09-10T00:00:00Z" }),
            node({ number: 2, mergedAt: "2026-09-12T00:00:00Z", state: null }),
          ],
        },
      },
    });

    expect(result.open).toEqual([
      expect.objectContaining({ number: 3, isDraft: true, ciStatus: "failure" }),
    ]);
    // Newest merge first, regardless of API order.
    expect(result.merged.map((pr) => [pr.number, pr.ciStatus])).toEqual([
      [2, "none"],
      [1, "success"],
    ]);
  });

  it("tolerates ghost authors, null nodes and missing commits", () => {
    const result = mapPullRequests({
      repository: {
        open: { nodes: [null, node({ author: null, commits: { nodes: null } })] },
        merged: { nodes: null },
      },
    });
    expect(result.open).toHaveLength(1);
    expect(result.open[0]).toMatchObject({ author: null, ciStatus: "none" });
    expect(result.merged).toEqual([]);
  });

  it("returns empty lists when the repo is not accessible", () => {
    expect(mapPullRequests({ repository: null })).toEqual({
      open: [],
      merged: [],
      defaultBranch: null,
      meta: { isPrivate: false, primaryLanguage: null, latestRelease: null },
      activity: [],
    });
  });
});

describe("default branch", () => {
  it("maps the latest default-branch commit and its CI status", () => {
    const result = mapPullRequests({
      repository: {
        defaultBranchRef: {
          name: "main",
          target: {
            oid: "abc1234def",
            messageHeadline: "fix: thing",
            committedDate: "2026-09-28T00:00:00Z",
            url: "https://github.com/acme/app/commit/abc1234def",
            statusCheckRollup: { state: "ERROR" },
          },
        },
        open: { nodes: [] },
        merged: { nodes: [] },
      },
    });
    expect(result.defaultBranch).toEqual({
      name: "main",
      ciStatus: "failure",
      sha: "abc1234def",
      message: "fix: thing",
      url: "https://github.com/acme/app/commit/abc1234def",
      committedAt: "2026-09-28T00:00:00Z",
    });
  });

  it("is null for empty repos", () => {
    const empty = { open: { nodes: [] }, merged: { nodes: [] } };
    expect(
      mapPullRequests({ repository: { ...empty, defaultBranchRef: null } }).defaultBranch,
    ).toBeNull();
    expect(
      mapPullRequests({
        repository: { ...empty, defaultBranchRef: { name: "main", target: null } },
      }).defaultBranch,
    ).toBeNull();
  });
});

describe("repo meta and activity", () => {
  it("maps language, latest release, visibility and recent activity", () => {
    const result = mapPullRequests({
      repository: {
        isPrivate: true,
        primaryLanguage: { name: "Go", color: "#00ADD8" },
        latestRelease: { tagName: "v2.8.1", url: "https://x/releases/v2.8.1", publishedAt: null },
        recent: {
          nodes: [null, { createdAt: "2026-09-01T00:00:00Z", mergedAt: null, closedAt: null }],
        },
        open: { nodes: [] },
        merged: { nodes: [] },
      },
    });
    expect(result.meta).toEqual({
      isPrivate: true,
      primaryLanguage: { name: "Go", color: "#00ADD8" },
      latestRelease: { tagName: "v2.8.1", url: "https://x/releases/v2.8.1", publishedAt: null },
    });
    expect(result.activity).toHaveLength(1);
  });
});
