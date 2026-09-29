import { describe, expect, it } from "vitest";

import type { Repo } from "@/db/schema";
import type { PullRequest, RepoPullRequests } from "@/lib/github/pull-requests";
import { buildOverview } from "@/lib/overview";

const now = new Date("2026-09-29T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

const repo = (name: string): Repo => ({
  id: name,
  installationId: 1,
  owner: "acme",
  name,
  vercelProjectId: null,
  createdAt: now,
});

function pr(number: number, overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number,
    title: `PR ${number}`,
    url: "",
    author: { login: "dev", avatarUrl: "" },
    isDraft: false,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    mergedAt: null,
    ciStatus: "success",
    reviewState: "approved",
    approvals: 1,
    requestedReviewers: [],
    headRefName: "b",
    additions: 0,
    deletions: 0,
    ...overrides,
  };
}

function data(open: PullRequest[], mainCi: "success" | "failure" = "success"): RepoPullRequests {
  return {
    open,
    merged: [],
    defaultBranch: {
      name: "main",
      ciStatus: mainCi,
      sha: "a",
      message: "",
      url: "",
      committedAt: "",
    },
    meta: { isPrivate: false, primaryLanguage: null, latestRelease: null },
    activity: [],
  };
}

describe("buildOverview", () => {
  const overview = buildOverview(
    [
      { repo: repo("quiet"), data: data([pr(1)]) },
      {
        repo: repo("busy"),
        data: data(
          [
            pr(2, {
              updatedAt: daysAgo(18),
              createdAt: daysAgo(20),
              reviewState: "awaiting_review",
            }),
            pr(3, { ciStatus: "failure" }),
            pr(4, { reviewState: "awaiting_review", createdAt: daysAgo(2) }),
          ],
          "failure",
        ),
      },
      { repo: repo("stale-only"), data: data([pr(5, { updatedAt: daysAgo(9) })]) },
    ],
    now,
  );

  it("sorts repos by attention: failing main, failing PRs, stale, then open count", () => {
    expect(overview.repos.map((r) => r.repo.name)).toEqual(["busy", "stale-only", "quiet"]);
    expect(overview.repos[0]).toMatchObject({ openCount: 3, staleCount: 1, failingPrCount: 1 });
  });

  it("builds the stale card, oldest first", () => {
    expect(overview.stale.count).toBe(2);
    expect(overview.stale.items).toEqual([
      { repoId: "busy", label: "busy #2", detail: "18d" },
      { repoId: "stale-only", label: "stale-only #5", detail: "9d" },
    ]);
  });

  it("counts failing default branches and failing PRs", () => {
    expect(overview.failingCi.count).toBe(2);
    expect(overview.failingCi.items.map((i) => i.label)).toEqual(["busy (main)", "busy #3"]);
  });

  it("averages review wait time", () => {
    expect(overview.waitingForReview.count).toBe(2);
    expect(overview.waitingForReview.avgWaitDays).toBe(11);
  });

  it("handles no repos", () => {
    const empty = buildOverview([], now);
    expect(empty.repos).toEqual([]);
    expect(empty.waitingForReview.avgWaitDays).toBeNull();
  });
});
